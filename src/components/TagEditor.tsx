import React, { useState, useEffect } from 'react';
import { X, Tag, Plus } from 'lucide-react';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#7c83fd', '#4ecb71', '#f87171', '#fbbf24',
  '#38bdf8', '#f472b6', '#a78bfa', '#fb923c',
];

export const TagEditor: React.FC<TagEditorProps> = ({ tags, onChange, onClose }) => {
  const [input, setInput] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const addTag = () => {
    const t = input.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-label="Edit tags">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title"><Tag size={16} /><span>Edit Tags</span></div>
          <button className="icon-btn icon-btn--xs" onClick={onClose} aria-label="Close"><X size={14} /></button>
        </div>

        <div className="tag-list">
          {tags.length === 0 && <span className="tag-list__empty">No tags yet</span>}
          {tags.map((tag, i) => (
            <span
              key={tag}
              className="tag"
              style={{ borderColor: PRESET_COLORS[i % PRESET_COLORS.length] + '80', color: PRESET_COLORS[i % PRESET_COLORS.length] }}
            >
              {tag}
              <button onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="tag__remove">×</button>
            </span>
          ))}
        </div>

        <div className="tag-input-row">
          <input
            className="find-replace__input"
            placeholder="Add a tag…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') onClose(); }}
            aria-label="New tag"
            id="tag-input"
            autoFocus
          />
          <button className="icon-btn icon-btn--primary" onClick={addTag} aria-label="Add tag">
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
