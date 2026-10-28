import React from 'react';
import { FileText, Clock, BookOpen, Save, CheckCheck } from 'lucide-react';
import { readingTime } from '../utils/storage';

interface StatusBarProps {
  wordCount: number;
  title: string;
  updatedAt: number;
  isSaved: boolean;
  onShowStats: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const StatusBar: React.FC<StatusBarProps> = ({ wordCount, title, updatedAt, isSaved, onShowStats }) => {
  const mins = readingTime(wordCount);

  return (
    <footer className="status-bar" role="status" aria-label="Document status">
      <div className="status-bar__left">
        <FileText size={12} />
        <span className="status-bar__title">{title}</span>
      </div>

      <div className="status-bar__center">
        <button
          className="status-bar__stats-btn"
          onClick={onShowStats}
          title="View document statistics"
          aria-label="View document statistics"
        >
          <span>{wordCount.toLocaleString()} words</span>
          <span className="status-bar__sep">·</span>
          <BookOpen size={11} />
          <span>{mins} min read</span>
        </button>
      </div>

      <div className="status-bar__right">
        {isSaved ? (
          <CheckCheck size={11} className="status-bar__saved" />
        ) : (
          <Save size={11} className="status-bar__unsaved" />
        )}
        <span className={isSaved ? 'status-bar__saved' : 'status-bar__unsaved'}>
          {isSaved ? 'Saved' : 'Saving…'}
        </span>
        <span className="status-bar__sep">·</span>
        <Clock size={11} />
        <span>{formatTime(updatedAt)}</span>
      </div>
    </footer>
  );
};
