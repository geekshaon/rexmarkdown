import React, { useEffect } from 'react';
import { X, History, RotateCcw } from 'lucide-react';
import type { DocSnapshot } from '../types';

interface HistoryPanelProps {
  snapshots: DocSnapshot[];
  onRestore: (snap: DocSnapshot) => void;
  onClose: () => void;
}

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ snapshots, onRestore, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Document history">
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <History size={16} />
            <span>Document History</span>
          </div>
          <button className="icon-btn icon-btn--xs" onClick={onClose} aria-label="Close history">
            <X size={14} />
          </button>
        </div>
        <p className="modal__subtitle">Snapshots saved every 30 seconds. Click to restore.</p>

        {snapshots.length === 0 ? (
          <div className="history-empty">No snapshots yet. Snapshots are taken every 30 seconds.</div>
        ) : (
          <div className="history-list">
            {snapshots.map((snap, i) => (
              <div key={snap.savedAt} className="history-item">
                <div className="history-item__meta">
                  <span className="history-item__num">#{snapshots.length - i}</span>
                  <span className="history-item__time">{formatTs(snap.savedAt)}</span>
                  <span className="history-item__words">{wordCount(snap.content)} words</span>
                </div>
                <pre className="history-item__preview">
                  {snap.content.slice(0, 200)}{snap.content.length > 200 ? '…' : ''}
                </pre>
                <button
                  className="history-item__restore"
                  onClick={() => { onRestore(snap); onClose(); }}
                  aria-label={`Restore snapshot from ${formatTs(snap.savedAt)}`}
                >
                  <RotateCcw size={12} />
                  Restore this version
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
