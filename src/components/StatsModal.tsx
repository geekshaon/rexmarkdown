import React, { useEffect } from 'react';
import { X, BarChart2, FileText, Clock, AlignLeft, Layers, Hash, Type } from 'lucide-react';
import type { DocStats } from '../types';

interface StatsModalProps {
  stats: DocStats;
  title: string;
  onClose: () => void;
}

interface StatRow {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

export const StatsModal: React.FC<StatsModalProps> = ({ stats, title, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const rows: StatRow[] = [
    { icon: <Type size={14} />, label: 'Words', value: stats.words.toLocaleString() },
    { icon: <Hash size={14} />, label: 'Characters', value: stats.chars.toLocaleString() },
    { icon: <Hash size={14} />, label: 'Characters (no spaces)', value: stats.charsNoSpaces.toLocaleString() },
    { icon: <AlignLeft size={14} />, label: 'Lines', value: stats.lines.toLocaleString() },
    { icon: <Layers size={14} />, label: 'Paragraphs', value: stats.paragraphs.toLocaleString() },
    { icon: <FileText size={14} />, label: 'Sentences', value: stats.sentences.toLocaleString() },
    { icon: <Clock size={14} />, label: 'Reading time', value: `${stats.readingTime} min` },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Document statistics">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <BarChart2 size={16} />
            <span>Document Stats</span>
          </div>
          <button className="icon-btn icon-btn--xs" onClick={onClose} aria-label="Close stats">
            <X size={14} />
          </button>
        </div>

        <p className="modal__subtitle">{title}</p>

        <div className="stats-grid">
          {rows.map((row) => (
            <div key={row.label} className="stats-row">
              <div className="stats-row__label">
                {row.icon}
                <span>{row.label}</span>
              </div>
              <span className="stats-row__value">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
