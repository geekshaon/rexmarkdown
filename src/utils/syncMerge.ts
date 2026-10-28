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
 * Two-way deterministic merge of document libraries based on document ID and updatedAt timestamp.
 */
export function mergeDocumentLibraries(
  localDocs: Document[],
  remoteDocs: Document[]
): MergeResult {
  const mergedMap = new Map<string, Document>();
  let addedFromRemote = 0;
  let updatedFromRemote = 0;
  let sentToRemote = 0;
  let identical = 0;

  // Index local docs by id
  for (const doc of localDocs) {
    mergedMap.set(doc.id, { ...doc });
  }

  // Merge remote docs
  for (const rDoc of remoteDocs) {
    const lDoc = mergedMap.get(rDoc.id);
    if (!lDoc) {
      // Remote doc does not exist locally -> add it
      mergedMap.set(rDoc.id, { ...rDoc });
      addedFromRemote++;
    } else {
      // Exists on both sides -> compare updatedAt
      if (rDoc.updatedAt > lDoc.updatedAt) {
        // Remote is newer -> update local
        mergedMap.set(rDoc.id, { ...rDoc });
        updatedFromRemote++;
      } else if (lDoc.updatedAt > rDoc.updatedAt) {
        // Local is newer -> remote should receive this
        sentToRemote++;
      } else {
        identical++;
      }
    }
  }

  // Count local docs that remote didn't have
  for (const lDoc of localDocs) {
    if (!remoteDocs.some((r) => r.id === lDoc.id)) {
      sentToRemote++;
    }
  }

  const merged = Array.from(mergedMap.values());
  const hasChanges = addedFromRemote > 0 || updatedFromRemote > 0 || sentToRemote > 0;

  return {
    merged,
    stats: {
      addedFromRemote,
      updatedFromRemote,
      sentToRemote,
      identical,
    },
    hasChanges,
  };
}
