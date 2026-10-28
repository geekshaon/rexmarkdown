import React, { useState } from 'react';
import {
  FileText, Plus, Eye, Edit3, Search, QrCode,
  MoreHorizontal, X, BarChart2, History, Tag, FileDown, Copy,
  ZoomIn, ZoomOut, Pin,
} from 'lucide-react';
import type { LayoutMode } from '../types';

interface MobileBottomNavProps {
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
  onToggleSidebar: () => void;
  onCreateDoc: () => void;
  onToggleFind: () => void;
  onOpenSync: () => void;
  isSyncing: boolean;
  // More menu actions
  docTitle?: string;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onShowStats?: () => void;
  onShowHistory?: () => void;
  onShowTags?: () => void;
  onExportMarkdown?: () => void;
  onCopyHtml?: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  layoutMode,
  onLayoutChange,
  onToggleSidebar,
  onCreateDoc,
  onToggleFind,
  onOpenSync,
  isSyncing,
  docTitle,
  isPinned,
  onTogglePin,
  onShowStats,
  onShowHistory,
  onShowTags,
  onExportMarkdown,
  onCopyHtml,
  fontSize,
  onFontSizeChange,
}) => {
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const isWriting = layoutMode === 'editor' || layoutMode === 'split';

  const toggleWritePreview = () => {
    onLayoutChange(isWriting ? 'preview' : 'editor');
  };

  return (
    <>
      <nav className="mobile-nav" aria-label="Mobile navigation bar">
        <button
          className="mobile-nav__btn"
          onClick={onToggleSidebar}
          aria-label="Documents drawer"
        >
          <FileText size={20} />
          <span>Notes</span>
        </button>

        <button
          className="mobile-nav__btn"
          onClick={onToggleFind}
          aria-label="Find and replace"
        >
          <Search size={20} />
          <span>Search</span>
        </button>

        {/* Floating Add Action */}
        <button
          className="mobile-nav__btn mobile-nav__btn--primary"
          onClick={onCreateDoc}
          aria-label="Create new document"
        >
          <Plus size={22} />
        </button>

        {/* View switcher: Write vs Preview */}
        <button
          className={`mobile-nav__btn ${!isWriting ? 'mobile-nav__btn--active' : ''}`}
          onClick={toggleWritePreview}
          aria-label={isWriting ? 'Switch to Preview' : 'Switch to Edit'}
        >
          {isWriting ? <Eye size={20} /> : <Edit3 size={20} />}
          <span>{isWriting ? 'Preview' : 'Write'}</span>
        </button>

        {/* P2P Sync */}
        <button
          className={`mobile-nav__btn ${isSyncing ? 'mobile-nav__btn--active' : ''}`}
          onClick={onOpenSync}
          aria-label="Device sync"
        >
          <div className="mobile-nav__sync-wrap">
            <QrCode size={20} />
            {isSyncing && <span className="sync-status-dot-active" />}
          </div>
          <span>Sync</span>
        </button>

        {/* More sheet */}
        <button
          className="mobile-nav__btn"
          onClick={() => setShowMoreSheet(true)}
          aria-label="More tools and actions"
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Native Bottom Sheet */}
      {showMoreSheet && (
        <div
          className="mobile-sheet-overlay"
          onClick={() => setShowMoreSheet(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="mobile-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-sheet__drag-handle" />

            <div className="mobile-sheet__header">
              <span className="mobile-sheet__title">
                {docTitle || 'Document Actions'}
              </span>
              <button
                className="icon-btn icon-btn--xs"
                onClick={() => setShowMoreSheet(false)}
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Grid of Actions */}
            <div className="mobile-sheet__grid">
              {onTogglePin && (
                <button
                  className={`mobile-sheet__item ${isPinned ? 'mobile-sheet__item--active' : ''}`}
                  onClick={() => { onTogglePin(); setShowMoreSheet(false); }}
                >
                  <Pin size={18} />
                  <span>{isPinned ? 'Unpin' : 'Pin Note'}</span>
                </button>
              )}

              {onShowTags && (
                <button
                  className="mobile-sheet__item"
                  onClick={() => { onShowTags(); setShowMoreSheet(false); }}
                >
                  <Tag size={18} />
                  <span>Tags</span>
                </button>
              )}

              {onShowStats && (
                <button
                  className="mobile-sheet__item"
                  onClick={() => { onShowStats(); setShowMoreSheet(false); }}
                >
                  <BarChart2 size={18} />
                  <span>Stats</span>
                </button>
              )}

              {onShowHistory && (
                <button
                  className="mobile-sheet__item"
                  onClick={() => { onShowHistory(); setShowMoreSheet(false); }}
                >
                  <History size={18} />
                  <span>History</span>
                </button>
              )}

              {onExportMarkdown && (
                <button
                  className="mobile-sheet__item"
                  onClick={() => { onExportMarkdown(); setShowMoreSheet(false); }}
                >
                  <FileDown size={18} />
                  <span>Export .md</span>
                </button>
              )}

              {onCopyHtml && (
                <button
                  className="mobile-sheet__item"
                  onClick={() => { onCopyHtml(); setShowMoreSheet(false); }}
                >
                  <Copy size={18} />
                  <span>Copy HTML</span>
                </button>
              )}
            </div>

            {/* Font size row */}
            <div className="mobile-sheet__row">
              <span className="mobile-sheet__row-label">Font Size: {fontSize}px</span>
              <div className="mobile-sheet__font-btns">
                <button
                  className="btn btn--secondary btn--xs"
                  onClick={() => onFontSizeChange(Math.max(11, fontSize - 1))}
                  title="Smaller font"
                >
                  <ZoomOut size={14} />
                  <span>A-</span>
                </button>
                <button
                  className="btn btn--secondary btn--xs"
                  onClick={() => onFontSizeChange(Math.min(28, fontSize + 1))}
                  title="Larger font"
                >
                  <ZoomIn size={14} />
                  <span>A+</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
