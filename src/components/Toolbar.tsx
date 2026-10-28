import React from 'react';
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  Link, Image, Code, List, ListOrdered, Quote, Minus, Table, CheckSquare,
  Eye, EyeOff, Columns2, FileDown, FileUp, Search, ZoomIn, ZoomOut,
  Maximize2, Minimize2, BarChart2, History, Tag, Link2Off, Copy, Pin, QrCode, Edit3,
} from 'lucide-react';
import type { LayoutMode } from '../types';

interface ToolbarProps {
  layoutMode: LayoutMode;
  fontSize: number;
  scrollSync: boolean;
  isPinned: boolean;
  onLayoutChange: (mode: LayoutMode) => void;
  onFormat: (type: string) => void;
  onExportMarkdown: () => void;
  onImportMarkdown: () => void;
  onCopyHtml: () => void;
  onToggleFindReplace: () => void;
  onFontSizeChange: (size: number) => void;
  onToggleScrollSync: () => void;
  onToggleZen: () => void;
  onShowStats: () => void;
  onShowHistory: () => void;
  onTogglePin: () => void;
  onShowTags: () => void;
  isSyncing?: boolean;
  onOpenSync: () => void;
}

interface ToolButton {
  icon: React.ReactNode;
  label: string;
  action: string;
  shortcut?: string;
}

const TOOL_GROUPS: ToolButton[][] = [
  [
    { icon: <Heading1 size={15} />, label: 'Heading 1', action: 'h1', shortcut: 'Ctrl+1' },
    { icon: <Heading2 size={15} />, label: 'Heading 2', action: 'h2', shortcut: 'Ctrl+2' },
    { icon: <Heading3 size={15} />, label: 'Heading 3', action: 'h3', shortcut: 'Ctrl+3' },
  ],
  [
    { icon: <Bold size={15} />, label: 'Bold', action: 'bold', shortcut: 'Ctrl+B' },
    { icon: <Italic size={15} />, label: 'Italic', action: 'italic', shortcut: 'Ctrl+I' },
    { icon: <Code size={15} />, label: 'Inline Code', action: 'code', shortcut: 'Ctrl+`' },
    { icon: <Quote size={15} />, label: 'Blockquote', action: 'quote' },
  ],
  [
    { icon: <Link size={15} />, label: 'Link', action: 'link', shortcut: 'Ctrl+K' },
    { icon: <Image size={15} />, label: 'Image', action: 'image' },
    { icon: <Table size={15} />, label: 'Table', action: 'table' },
    { icon: <CheckSquare size={15} />, label: 'Task List', action: 'task' },
  ],
  [
    { icon: <List size={15} />, label: 'Bullet List', action: 'ul' },
    { icon: <ListOrdered size={15} />, label: 'Numbered List', action: 'ol' },
    { icon: <Minus size={15} />, label: 'Divider', action: 'hr' },
  ],
];

export const Toolbar: React.FC<ToolbarProps> = ({
  layoutMode, fontSize, scrollSync, isPinned,
  onLayoutChange, onFormat, onExportMarkdown, onImportMarkdown,
  onCopyHtml, onToggleFindReplace, onFontSizeChange,
  onToggleScrollSync, onToggleZen, onShowStats, onShowHistory,
  onTogglePin, onShowTags, isSyncing, onOpenSync,
}) => {
  const isZen = layoutMode === 'zen';

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting toolbar">
      {/* Format groups */}
      {!isZen && (
        <div className="toolbar__groups">
          {TOOL_GROUPS.map((group, gi) => (
            <React.Fragment key={gi}>
              <div className="toolbar__group">
                {group.map((btn) => (
                  <button
                    key={btn.action}
                    className="toolbar__btn"
                    onClick={() => onFormat(btn.action)}
                    title={btn.shortcut ? `${btn.label} (${btn.shortcut})` : btn.label}
                    aria-label={btn.label}
                  >
                    {btn.icon}
                  </button>
                ))}
              </div>
              {gi < TOOL_GROUPS.length - 1 && <div className="toolbar__sep" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Right side controls */}
      <div className="toolbar__right" style={{ marginLeft: isZen ? 'auto' : undefined }}>
        {!isZen && (
          <>
            {/* Find & Replace */}
            <button
              className="toolbar__btn"
              onClick={onToggleFindReplace}
              title="Find & Replace (Ctrl+H)"
              aria-label="Find and Replace"
            >
              <Search size={15} />
            </button>

            <div className="toolbar__desktop-items desktop-only">
              <div className="toolbar__sep" />

              {/* Font size */}
              <div className="font-size-ctrl" aria-label="Font size">
                <button
                  className="icon-btn icon-btn--xs"
                  onClick={() => onFontSizeChange(Math.max(11, fontSize - 1))}
                  title="Decrease font size"
                  aria-label="Decrease font size"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="font-size-val" aria-label={`Font size ${fontSize}px`}>{fontSize}</span>
                <button
                  className="icon-btn icon-btn--xs"
                  onClick={() => onFontSizeChange(Math.min(28, fontSize + 1))}
                  title="Increase font size"
                  aria-label="Increase font size"
                >
                  <ZoomIn size={13} />
                </button>
              </div>

              <div className="toolbar__sep" />

              {/* Scroll sync toggle */}
              <button
                className={`toolbar__btn ${scrollSync ? 'toolbar__btn--active' : ''}`}
                onClick={onToggleScrollSync}
                title={scrollSync ? 'Disable scroll sync' : 'Enable scroll sync'}
                aria-label="Toggle scroll sync"
                aria-pressed={scrollSync}
              >
                <Link2Off size={15} />
              </button>

              <div className="toolbar__sep" />

              {/* Doc actions */}
              <button className="toolbar__btn" onClick={onTogglePin} title={isPinned ? 'Unpin document' : 'Pin document'} aria-label="Pin document" aria-pressed={isPinned}>
                <Pin size={15} style={{ fill: isPinned ? 'var(--accent)' : 'none', color: isPinned ? 'var(--accent)' : undefined }} />
              </button>
              <button className="toolbar__btn" onClick={onShowTags} title="Edit tags" aria-label="Edit tags">
                <Tag size={15} />
              </button>
              <button className="toolbar__btn" onClick={onShowHistory} title="Document history" aria-label="Document history">
                <History size={15} />
              </button>
              <button className="toolbar__btn" onClick={onShowStats} title="Document stats" aria-label="Document stats">
                <BarChart2 size={15} />
              </button>

              <div className="toolbar__sep" />

              {/* Import / Export / Copy HTML */}
              <button className="toolbar__btn toolbar__btn--text" onClick={onImportMarkdown} title="Import .md file" aria-label="Import Markdown">
                <FileUp size={15} />
                <span>Import</span>
              </button>
              <button className="toolbar__btn toolbar__btn--text" onClick={onExportMarkdown} title="Download as .md file" aria-label="Export Markdown">
                <FileDown size={15} />
                <span>Export</span>
              </button>
              <button className="toolbar__btn toolbar__btn--text" onClick={onCopyHtml} title="Copy as HTML" aria-label="Copy HTML">
                <Copy size={15} />
                <span>HTML</span>
              </button>
            </div>

            <div className="toolbar__sep desktop-only" />

            <button
              className={`toolbar__btn toolbar__btn--text ${isSyncing ? 'toolbar__btn--active' : ''}`}
              onClick={onOpenSync}
              title="Two-Way P2P Device Sync (PC ↔ Mobile)"
              aria-label="P2P Device Sync"
            >
              <QrCode size={15} style={{ color: isSyncing ? 'var(--accent)' : undefined }} />
              <span>Sync</span>
              {isSyncing && <span className="sync-status-dot-active" />}
            </button>

            <div className="toolbar__sep" />
          </>
        )}

        {/* Mobile segmented toggle (Write vs Preview) */}
        {!isZen && (
          <div className="mobile-segmented-control" role="group" aria-label="Mobile view mode">
            <button
              className={`mobile-seg-btn ${layoutMode !== 'preview' ? 'mobile-seg-btn--active' : ''}`}
              onClick={() => onLayoutChange('editor')}
              aria-label="Write mode"
            >
              <Edit3 size={13} />
              <span>Write</span>
            </button>
            <button
              className={`mobile-seg-btn ${layoutMode === 'preview' ? 'mobile-seg-btn--active' : ''}`}
              onClick={() => onLayoutChange('preview')}
              aria-label="Preview mode"
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
          </div>
        )}

        {/* Desktop Layout switcher */}
        {!isZen && (
          <div className="layout-switcher desktop-only" role="group" aria-label="Layout">
            <button
              className={`layout-btn ${layoutMode === 'editor' ? 'layout-btn--active' : ''}`}
              onClick={() => onLayoutChange('editor')}
              title="Editor only" aria-label="Editor only" aria-pressed={layoutMode === 'editor'}
            >
              <Eye size={14} />
            </button>
            <button
              className={`layout-btn ${layoutMode === 'split' ? 'layout-btn--active' : ''}`}
              onClick={() => onLayoutChange('split')}
              title="Split view" aria-label="Split view" aria-pressed={layoutMode === 'split'}
            >
              <Columns2 size={14} />
            </button>
            <button
              className={`layout-btn ${layoutMode === 'preview' ? 'layout-btn--active' : ''}`}
              onClick={() => onLayoutChange('preview')}
              title="Preview only" aria-label="Preview only" aria-pressed={layoutMode === 'preview'}
            >
              <EyeOff size={14} />
            </button>
          </div>
        )}

        {/* Zen mode toggle */}
        <button
          className={`toolbar__btn ${isZen ? 'toolbar__btn--active' : ''}`}
          onClick={onToggleZen}
          title={isZen ? 'Exit Zen mode (F11)' : 'Zen mode (F11)'}
          aria-label={isZen ? 'Exit Zen mode' : 'Enter Zen mode'}
          aria-pressed={isZen}
        >
          {isZen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </div>
  );
};
