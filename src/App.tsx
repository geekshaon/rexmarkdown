import { useState, useCallback, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { Editor } from './components/Editor';
import type { EditorApi } from './components/Editor';
import { Preview } from './components/Preview';
import { StatusBar } from './components/StatusBar';
import { FindReplace } from './components/FindReplace';
import type { FindOptions } from './components/FindReplace';
import { StatsModal } from './components/StatsModal';
import { HistoryPanel } from './components/HistoryPanel';
import { TagEditor } from './components/TagEditor';
import { SyncModal } from './components/SyncModal';
import { MobileFormatRibbon } from './components/MobileFormatRibbon';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ToastContainer } from './components/Toast';
import type { Toast } from './components/Toast';
import { useDocuments } from './hooks/useDocuments';
import { useP2PSync } from './hooks/useP2PSync';
import type { LayoutMode } from './types';
import { loadSettings, saveSettings } from './utils/settings';
import { computeStats } from './utils/stats';
import { renderMarkdown } from './utils/markdownRenderer';

function App() {
  const {
    documents, activeDoc, createDocument, updateDocument,
    deleteDocument, renameDocument, selectDocument,
    togglePin, updateTags, restoreSnapshot, importDocument,
    replaceDocuments, upsertDocument,
  } = useDocuments();

  // Settings
  const [settings, setSettings] = useState(loadSettings);
  const updateSettings = useCallback((patch: Partial<typeof settings>) => {
    setSettings((s) => { const next = { ...s, ...patch }; saveSettings(next); return next; });
  }, []);

  // UI state
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [layoutMode, setLayoutMode]           = useState<LayoutMode>('split');
  const [isSaved, setIsSaved]                 = useState(true);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showStats, setShowStats]             = useState(false);
  const [showHistory, setShowHistory]         = useState(false);
  const [showTags, setShowTags]               = useState(false);
  const [showSyncModal, setShowSyncModal]     = useState(false);
  const [scrollPct, setScrollPct]             = useState(0);
  const [toasts, setToasts]                   = useState<Toast[]>([]);

  const editorApiRef     = useRef<EditorApi | null>(null);
  const formatHandlerRef = useRef<((type: string) => void) | null>(null);
  const saveTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importInputRef   = useRef<HTMLInputElement>(null);

  // Toast helper
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // P2P WebRTC Two-Way Sync hook
  const sync = useP2PSync({
    documents,
    onDocumentsMerged: replaceDocuments,
    onLiveUpdate: upsertDocument,
    onToast: addToast,
  });

  // Auto-connect if page opened with ?sync=<hostPeerId> (e.g. mobile scanned QR)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const syncPeer = params.get('sync');
    if (syncPeer) {
      window.history.replaceState({}, '', window.location.pathname);
      addToast('Pairing with remote device via WebRTC...', 'info');
      sync.connectToHost(syncPeer);
      setShowSyncModal(true);
    }
  }, [sync, addToast]);

  // Content change
  const handleContentChange = useCallback((value: string) => {
    if (!activeDoc) return;
    setIsSaved(false);
    updateDocument(activeDoc.id, { content: value });
    sync.broadcastLiveUpdate({ ...activeDoc, content: value, updatedAt: Date.now() });
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setIsSaved(true), 800);
  }, [activeDoc, updateDocument, sync]);

  // Format
  const handleFormatRegister = useCallback((fn: (type: string) => void) => {
    formatHandlerRef.current = fn;
  }, []);
  const handleFormat = useCallback((type: string) => { formatHandlerRef.current?.(type); }, []);

  // Export
  const handleExportMarkdown = useCallback(() => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${activeDoc.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Markdown exported!');
  }, [activeDoc, addToast]);

  // Import
  const handleImportMarkdown = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const title = file.name.replace(/\.md$/i, '').replace(/_/g, ' ');
      importDocument(title, content);
      addToast(`Imported "${title}"`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [importDocument, addToast]);

  // Copy as HTML
  const handleCopyHtml = useCallback(async () => {
    if (!activeDoc) return;
    const html = renderMarkdown(activeDoc.content);
    try {
      await navigator.clipboard.writeText(html);
      addToast('HTML copied to clipboard!');
    } catch {
      addToast('Failed to copy HTML', 'error');
    }
  }, [activeDoc, addToast]);

  // Zen mode
  const handleToggleZen = useCallback(() => {
    setLayoutMode((m) => m === 'zen' ? 'split' : 'zen');
    setSidebarOpen((v) => layoutMode !== 'zen' ? false : v);
  }, [layoutMode]);

  // Scroll sync
  const handleEditorScroll = useCallback((pct: number) => {
    if (settings.scrollSync) setScrollPct(pct);
  }, [settings.scrollSync]);

  // Find & Replace handlers connected to EditorApi
  const [findMatchCount, setFindMatchCount] = useState(0);
  const [findCurrentMatch, setFindCurrentMatch] = useState(0);

  const handleEditorApi = useCallback((api: EditorApi) => {
    editorApiRef.current = api;
  }, []);

  const handleFind = useCallback((query: string, opts: FindOptions) => {
    if (!editorApiRef.current) return;
    const res = editorApiRef.current.find(query, opts);
    setFindMatchCount(res.count);
    setFindCurrentMatch(res.current);
  }, []);

  const handleFindNext = useCallback(() => {
    if (!editorApiRef.current) return;
    const res = editorApiRef.current.findNext();
    setFindMatchCount(res.count);
    setFindCurrentMatch(res.current);
  }, []);

  const handleFindPrev = useCallback(() => {
    if (!editorApiRef.current) return;
    const res = editorApiRef.current.findPrev();
    setFindMatchCount(res.count);
    setFindCurrentMatch(res.current);
  }, []);

  const handleReplace = useCallback((replacement: string) => {
    if (!editorApiRef.current) return;
    const res = editorApiRef.current.replace(replacement);
    setFindMatchCount(res.count);
    setFindCurrentMatch(res.current);
  }, []);

  const handleReplaceAll = useCallback((replacement: string) => {
    if (!editorApiRef.current) return;
    const res = editorApiRef.current.replaceAll(replacement);
    setFindMatchCount(res.count);
    setFindCurrentMatch(res.current);
    addToast('All matches replaced');
  }, [addToast]);

  const handleImagePaste = useCallback((dataUrl: string) => {
    editorApiRef.current?.insertImage(dataUrl);
    addToast('Image pasted into document');
  }, [addToast]);

  // Stats
  const docStats = activeDoc ? computeStats(activeDoc.content) : null;

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') { e.preventDefault(); handleToggleZen(); return; }
      if (!e.ctrlKey && !e.metaKey) return;
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); handleFormat('bold'); break;
        case 'i': e.preventDefault(); handleFormat('italic'); break;
        case 'k': e.preventDefault(); handleFormat('link'); break;
        case '`': e.preventDefault(); handleFormat('code'); break;
        case '1': e.preventDefault(); handleFormat('h1'); break;
        case '2': e.preventDefault(); handleFormat('h2'); break;
        case '3': e.preventDefault(); handleFormat('h3'); break;
        case 's': e.preventDefault(); setIsSaved(true); break;
        case 'n': e.preventDefault(); createDocument(); break;
        case 'h': e.preventDefault(); setShowFindReplace((v) => !v); break;
        case '\\': e.preventDefault(); setSidebarOpen((v) => !v); break;
        case '=':
        case '+': if (e.ctrlKey) { e.preventDefault(); updateSettings({ fontSize: Math.min(28, settings.fontSize + 1) }); } break;
        case '-': if (e.ctrlKey) { e.preventDefault(); updateSettings({ fontSize: Math.max(11, settings.fontSize - 1) }); } break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleFormat, handleToggleZen, createDocument, settings.fontSize, updateSettings]);

  const isZen = layoutMode === 'zen';

  return (
    <div className={`app ${sidebarOpen && !isZen ? 'app--sidebar-open' : ''} ${isZen ? 'app--zen' : ''}`}>
      {/* Hidden file input for import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        style={{ display: 'none' }}
        onChange={handleImportFile}
        aria-hidden="true"
      />

      {/* Sidebar */}
      {!isZen && (
        <Sidebar
          documents={documents}
          activeDocId={activeDoc?.id ?? null}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          onSelect={selectDocument}
          onCreate={createDocument}
          onDelete={deleteDocument}
          onRename={renameDocument}
          onTogglePin={togglePin}
        />
      )}

      {/* Main area */}
      <main className="main">
        {/* Toolbar */}
        <Toolbar
          layoutMode={layoutMode}
          fontSize={settings.fontSize}
          scrollSync={settings.scrollSync}
          isPinned={activeDoc?.pinned ?? false}
          onLayoutChange={setLayoutMode}
          onFormat={handleFormat}
          onExportMarkdown={handleExportMarkdown}
          onImportMarkdown={handleImportMarkdown}
          onCopyHtml={handleCopyHtml}
          onToggleFindReplace={() => setShowFindReplace((v) => !v)}
          onFontSizeChange={(size) => updateSettings({ fontSize: size })}
          onToggleScrollSync={() => updateSettings({ scrollSync: !settings.scrollSync })}
          onToggleZen={handleToggleZen}
          onShowStats={() => setShowStats(true)}
          onShowHistory={() => setShowHistory(true)}
          onTogglePin={() => activeDoc && togglePin(activeDoc.id)}
          onShowTags={() => setShowTags(true)}
          isSyncing={sync.status === 'connected'}
          onOpenSync={() => setShowSyncModal(true)}
        />

        {/* Find & Replace panel */}
        {showFindReplace && (
          <FindReplace
            onFind={handleFind}
            onReplace={handleReplace}
            onReplaceAll={handleReplaceAll}
            onClose={() => setShowFindReplace(false)}
            matchCount={findMatchCount}
            currentMatch={findCurrentMatch}
            onNext={handleFindNext}
            onPrev={handleFindPrev}
          />
        )}

        {/* Workspace */}
        <div className={`workspace workspace--${isZen ? 'editor' : layoutMode}`}>
          {(isZen || layoutMode === 'split' || layoutMode === 'editor') && (
            <div className={`pane pane--editor ${isZen ? 'pane--zen' : ''}`}>
              {activeDoc ? (
                <Editor
                  content={activeDoc.content}
                  fontSize={settings.fontSize}
                  onChange={handleContentChange}
                  onFormat={handleFormatRegister}
                  onScrollPct={handleEditorScroll}
                  onEditorApi={handleEditorApi}
                  onImagePaste={handleImagePaste}
                />
              ) : (
                <div className="empty-state">No document selected</div>
              )}
            </div>
          )}

          {!isZen && layoutMode === 'split' && <div className="pane-divider" />}

          {!isZen && (layoutMode === 'split' || layoutMode === 'preview') && (
            <div className="pane pane--preview">
              {activeDoc ? (
                <Preview
                  content={activeDoc.content}
                  scrollPct={settings.scrollSync ? scrollPct : undefined}
                />
              ) : (
                <div className="empty-state">No document selected</div>
              )}
            </div>
          )}
        </div>

        {/* Mobile quick format ribbon (when editing) */}
        {!isZen && layoutMode !== 'preview' && (
          <MobileFormatRibbon onFormat={handleFormat} />
        )}

        {/* Status bar */}
        {activeDoc && (
          <StatusBar
            wordCount={activeDoc.wordCount}
            title={activeDoc.title}
            updatedAt={activeDoc.updatedAt}
            isSaved={isSaved}
            onShowStats={() => setShowStats(true)}
          />
        )}
      </main>

      {/* Mobile Native Bottom Navigation */}
      {!isZen && (
        <MobileBottomNav
          layoutMode={layoutMode}
          onLayoutChange={setLayoutMode}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onCreateDoc={createDocument}
          onToggleFind={() => setShowFindReplace((v) => !v)}
          onOpenSync={() => setShowSyncModal(true)}
          isSyncing={sync.status === 'connected'}
          docTitle={activeDoc?.title}
          isPinned={activeDoc?.pinned}
          onTogglePin={() => activeDoc && togglePin(activeDoc.id)}
          onShowStats={() => setShowStats(true)}
          onShowHistory={() => setShowHistory(true)}
          onShowTags={() => setShowTags(true)}
          onExportMarkdown={handleExportMarkdown}
          onCopyHtml={handleCopyHtml}
          fontSize={settings.fontSize}
          onFontSizeChange={(size) => updateSettings({ fontSize: size })}
        />
      )}

      {/* Modals */}
      {showStats && activeDoc && docStats && (
        <StatsModal
          stats={docStats}
          title={activeDoc.title}
          onClose={() => setShowStats(false)}
        />
      )}

      {showHistory && activeDoc && (
        <HistoryPanel
          snapshots={activeDoc.snapshots ?? []}
          onRestore={(snap) => { restoreSnapshot(activeDoc.id, snap); addToast('Version restored!'); }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showTags && activeDoc && (
        <TagEditor
          tags={activeDoc.tags ?? []}
          onChange={(tags) => { updateTags(activeDoc.id, tags); }}
          onClose={() => setShowTags(false)}
        />
      )}

      {showSyncModal && (
        <SyncModal
          peerId={sync.peerId}
          status={sync.status}
          connectedPeers={sync.connectedPeers}
          lastSyncStats={sync.lastSyncStats}
          errorMessage={sync.errorMessage}
          onStartHost={sync.startHosting}
          onConnectToHost={sync.connectToHost}
          onSyncNow={sync.syncNow}
          onClose={() => setShowSyncModal(false)}
          onToast={addToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
