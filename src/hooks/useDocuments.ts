import { useState, useCallback, useEffect } from 'react';
import type { Document, DocSnapshot } from '../types';
import {
  loadDocuments,
  saveDocuments,
  loadActiveId,
  saveActiveId,
  countWords,
  createDefaultDocument,
} from '../utils/storage';

const MAX_SNAPSHOTS = 20;
const SNAPSHOT_INTERVAL = 30_000; // take a snapshot every 30s

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>(() => {
    const docs = loadDocuments();
    if (docs.length === 0) {
      const d = createDefaultDocument();
      saveDocuments([d]);
      return [d];
    }
    return docs;
  });

  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    const saved = loadActiveId();
    const docs = loadDocuments();
    if (saved && docs.find((d) => d.id === saved)) return saved;
    return docs[0]?.id ?? null;
  });

  // Persist on any change
  useEffect(() => { saveDocuments(documents); }, [documents]);
  useEffect(() => { saveActiveId(activeDocId); }, [activeDocId]);

  // Periodic snapshot of active doc
  useEffect(() => {
    const interval = setInterval(() => {
      setDocuments((prev) =>
        prev.map((doc) => {
          if (doc.id !== activeDocId) return doc;
          const snap: DocSnapshot = { content: doc.content, savedAt: Date.now() };
          const snapshots = [snap, ...(doc.snapshots ?? [])].slice(0, MAX_SNAPSHOTS);
          return { ...doc, snapshots };
        })
      );
    }, SNAPSHOT_INTERVAL);
    return () => clearInterval(interval);
  }, [activeDocId]);

  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;

  // Sorted: pinned first, then by updatedAt desc
  const sortedDocuments = [...documents].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  const createDocument = useCallback(() => {
    const doc = createDefaultDocument();
    doc.title = 'Untitled Document';
    doc.content = '# Untitled Document\n\nStart writing here...\n';
    doc.wordCount = countWords(doc.content);
    setDocuments((prev) => [doc, ...prev]);
    setActiveDocId(doc.id);
    return doc;
  }, []);

  const updateDocument = useCallback((id: string, changes: Partial<Document>) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== id) return doc;
        // Respect a caller-provided updatedAt (e.g. from broadcastLiveUpdate) to avoid
        // double-timestamp drift; fall back to Date.now() for normal edits.
        const updated = { ...doc, ...changes, updatedAt: changes.updatedAt ?? Date.now() };
        if (changes.content !== undefined) {
          updated.wordCount = countWords(changes.content);
        }
        return updated;
      })
    );
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (next.length === 0) {
        const def = createDefaultDocument();
        saveDocuments([def]);
        setActiveDocId(def.id);
        return [def];
      }
      if (activeDocId === id) setActiveDocId(next[0].id);
      return next;
    });
  }, [activeDocId]);

  const renameDocument = useCallback((id: string, title: string) => {
    updateDocument(id, { title });
  }, [updateDocument]);

  const selectDocument = useCallback((id: string) => {
    setActiveDocId(id);
  }, []);

  const togglePin = useCallback((id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => doc.id === id ? { ...doc, pinned: !doc.pinned } : doc)
    );
  }, []);

  const updateTags = useCallback((id: string, tags: string[]) => {
    updateDocument(id, { tags });
  }, [updateDocument]);

  const restoreSnapshot = useCallback((docId: string, snapshot: DocSnapshot) => {
    updateDocument(docId, { content: snapshot.content });
  }, [updateDocument]);

  const importDocument = useCallback((title: string, content: string) => {
    const doc = createDefaultDocument();
    doc.title = title;
    doc.content = content;
    doc.wordCount = countWords(content);
    setDocuments((prev) => [doc, ...prev]);
    setActiveDocId(doc.id);
    return doc;
  }, []);

  const replaceDocuments = useCallback((newDocs: Document[]) => {
    setDocuments(newDocs);
    saveDocuments(newDocs);
    if (newDocs.length > 0 && (!activeDocId || !newDocs.find((d) => d.id === activeDocId))) {
      setActiveDocId(newDocs[0].id);
    }
  }, [activeDocId]);

  const upsertDocument = useCallback((doc: Document) => {
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = doc;
        return next;
      }
      return [doc, ...prev];
    });
  }, []);

  return {
    documents: sortedDocuments,
    activeDoc,
    activeDocId,
    createDocument,
    updateDocument,
    deleteDocument,
    renameDocument,
    selectDocument,
    togglePin,
    updateTags,
    restoreSnapshot,
    importDocument,
    replaceDocuments,
    upsertDocument,
  };
}
