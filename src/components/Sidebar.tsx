import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Plus, Trash2, ChevronLeft, ChevronRight,
  Edit3, Check, X, Clock, Hash, Pin,
} from 'lucide-react';
import type { Document } from '../types';
import { readingTime } from '../utils/storage';

interface SidebarProps {
  documents: Document[];
  activeDocId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const TAG_COLORS = ['#7c83fd', '#4ecb71', '#f87171', '#fbbf24', '#38bdf8', '#f472b6', '#a78bfa', '#fb923c'];

export const Sidebar: React.FC<SidebarProps> = ({
  documents, activeDocId, open, onToggle,
  onSelect, onCreate, onDelete, onRename, onTogglePin,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEdit = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditValue(doc.title);
  };

  const commitEdit = () => {
    if (editingId) {
      const trimmed = editValue.trim();
      if (trimmed) onRename(editingId, trimmed);
      setEditingId(null);
    }
  };

  const cancelEdit = () => setEditingId(null);

  // Collect all unique tags for filter bar
  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags ?? [])));
  const filtered = filterTag ? documents.filter((d) => d.tags?.includes(filterTag)) : documents;

  return (
    <>
      {open && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {!open && (
        <button className="sidebar-toggle-btn" onClick={onToggle} title="Open sidebar" aria-label="Open sidebar">
          <ChevronRight size={16} />
        </button>
      )}

      <aside className={`sidebar ${open ? 'sidebar--open' : 'sidebar--closed'}`}>
        {/* Header */}
        <div className="sidebar__header">
          <div className="sidebar__brand">
            <span className="sidebar__logo">Rex</span>
            <span className="sidebar__logo-accent">MD</span>
          </div>
          <div className="sidebar__actions">
            <button className="icon-btn icon-btn--primary" onClick={onCreate} title="New document (Ctrl+N)" aria-label="New document">
              <Plus size={16} />
            </button>
            <button className="icon-btn" onClick={onToggle} title="Collapse sidebar (Ctrl+\)" aria-label="Collapse sidebar">
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* Doc count */}
        <div className="sidebar__meta">
          <Hash size={12} />
          <span>{documents.length} doc{documents.length !== 1 ? 's' : ''}</span>
          {documents.filter((d) => d.pinned).length > 0 && (
            <><Pin size={11} /><span>{documents.filter((d) => d.pinned).length} pinned</span></>
          )}
        </div>

        {/* Tag filter bar */}
        {allTags.length > 0 && (
          <div className="tag-filter">
            <button
              className={`tag-filter__all ${!filterTag ? 'tag-filter__all--active' : ''}`}
              onClick={() => setFilterTag(null)}
            >
              All
            </button>
            {allTags.map((tag, i) => (
              <button
                key={tag}
                className={`tag-filter__tag ${filterTag === tag ? 'tag-filter__tag--active' : ''}`}
                style={{ color: TAG_COLORS[i % TAG_COLORS.length] }}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Document list */}
        <nav className="sidebar__list" aria-label="Documents">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className={`doc-item ${doc.id === activeDocId ? 'doc-item--active' : ''} ${doc.pinned ? 'doc-item--pinned' : ''}`}
              onClick={() => {
                if (editingId !== doc.id) {
                  onSelect(doc.id);
                  if (window.innerWidth <= 768) onToggle();
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingId !== doc.id) {
                  onSelect(doc.id);
                  if (window.innerWidth <= 768) onToggle();
                }
              }}
            >
              <div className="doc-item__icon-wrap">
                {doc.pinned
                  ? <Pin size={13} style={{ color: 'var(--accent)' }} />
                  : <FileText size={13} className="doc-item__icon" />
                }
              </div>

              <div className="doc-item__body">
                {editingId === doc.id ? (
                  <input
                    ref={inputRef}
                    className="doc-item__rename-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="doc-item__title">{doc.title}</span>
                )}

                {/* Tags */}
                {(doc.tags ?? []).length > 0 && (
                  <div className="doc-item__tags">
                    {(doc.tags ?? []).slice(0, 3).map((tag, i) => (
                      <span key={tag} className="doc-item__tag" style={{ color: TAG_COLORS[i % TAG_COLORS.length] }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="doc-item__info">
                  <span className="doc-item__words">{doc.wordCount} words</span>
                  <span className="doc-item__sep">·</span>
                  <Clock size={10} />
                  <span>{readingTime(doc.wordCount)} min</span>
                </div>
                <span className="doc-item__date">{formatDate(doc.updatedAt)}</span>
              </div>

              <div className="doc-item__controls" onClick={(e) => e.stopPropagation()}>
                {editingId === doc.id ? (
                  <>
                    <button className="icon-btn icon-btn--xs icon-btn--success" onClick={commitEdit} title="Save name"><Check size={12} /></button>
                    <button className="icon-btn icon-btn--xs icon-btn--danger" onClick={cancelEdit} title="Cancel"><X size={12} /></button>
                  </>
                ) : (
                  <>
                    <button className="icon-btn icon-btn--xs" onClick={(e) => { e.stopPropagation(); onTogglePin(doc.id); }} title={doc.pinned ? 'Unpin' : 'Pin'}>
                      <Pin size={11} style={{ fill: doc.pinned ? 'var(--accent)' : 'none', color: doc.pinned ? 'var(--accent)' : undefined }} />
                    </button>
                    <button className="icon-btn icon-btn--xs" onClick={(e) => startEdit(doc, e)} title="Rename"><Edit3 size={12} /></button>
                    <button className="icon-btn icon-btn--xs icon-btn--danger" onClick={() => onDelete(doc.id)} title="Delete"><Trash2 size={12} /></button>
                  </>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="sidebar__empty">No docs match this tag</div>
          )}
        </nav>
      </aside>
    </>
  );
};
