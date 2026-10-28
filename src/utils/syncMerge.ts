import type { Document } from '../types';

export interface MergeResult {
  merged: Document[];
  stats: {
    addedFromRemote: number;
    updatedFromRemote: number;
    sentToRemote: number;
    identical: number;
  };
  hasChanges: boolean;
}

/**
 * Two-way deterministic merge of two document libraries.
 * Resolution strategy: last-write-wins by updatedAt timestamp.
 * Local history snapshots are always preserved, even when remote content wins.
 */
export function mergeDocumentLibraries(
  localDocs: Document[],
  remoteDocs: Document[]
): MergeResult {
  // Guard against invalid inputs from untrusted peers
  if (!Array.isArray(localDocs)) localDocs = [];
  if (!Array.isArray(remoteDocs)) {
    return {
      merged: localDocs,
      stats: { addedFromRemote: 0, updatedFromRemote: 0, sentToRemote: 0, identical: 0 },
      hasChanges: false,
    };
  }

  const mergedMap = new Map<string, Document>();
  let addedFromRemote = 0;
  let updatedFromRemote = 0;
  let sentToRemote = 0;
  let identical = 0;

  // Seed the map with all local documents (preserves snapshots)
  for (const doc of localDocs) {
    mergedMap.set(doc.id, { ...doc });
  }

  // Merge remote documents into the map
  for (const rDoc of remoteDocs) {
    const lDoc = mergedMap.get(rDoc.id);
    if (!lDoc) {
      // Brand-new doc from remote — add it
      mergedMap.set(rDoc.id, { ...rDoc, snapshots: rDoc.snapshots ?? [] });
      addedFromRemote++;
    } else {
      if (rDoc.updatedAt > lDoc.updatedAt) {
        // Remote is newer — take remote content but preserve local history snapshots
        mergedMap.set(rDoc.id, { ...rDoc, snapshots: lDoc.snapshots ?? [] });
        updatedFromRemote++;
      } else if (lDoc.updatedAt > rDoc.updatedAt) {
        // Local is newer — keep local (already in map); remote side will receive it
        sentToRemote++;
      } else {
        // Identical timestamp — already in sync
        identical++;
      }
    }
  }

  // Count local-only docs (not present on remote at all — will be sent to remote)
  for (const lDoc of localDocs) {
    if (!remoteDocs.some((r) => r.id === lDoc.id)) {
      sentToRemote++;
    }
  }

  const merged = Array.from(mergedMap.values());
  const hasChanges = addedFromRemote > 0 || updatedFromRemote > 0 || sentToRemote > 0;

  return {
    merged,
    stats: { addedFromRemote, updatedFromRemote, sentToRemote, identical },
    hasChanges,
  };
}
