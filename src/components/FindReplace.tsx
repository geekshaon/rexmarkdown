import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, ChevronUp, Replace } from 'lucide-react';

interface FindReplaceProps {
  onFind: (query: string, options: FindOptions) => void;
  onReplace: (replacement: string) => void;
  onReplaceAll: (replacement: string) => void;
  onClose: () => void;
  matchCount: number;
  currentMatch: number;
  onNext: () => void;
  onPrev: () => void;
}

export interface FindOptions {
  caseSensitive: boolean;
  regex: boolean;
  wholeWord: boolean;
}

export const FindReplace: React.FC<FindReplaceProps> = ({
  onFind,
  onReplace,
  onReplaceAll,
  onClose,
  matchCount,
  currentMatch,
  onNext,
  onPrev,
}) => {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [options, setOptions] = useState<FindOptions>({
    caseSensitive: false,
    regex: false,
    wholeWord: false,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    onFind(query, options);
  }, [query, options, onFind]);

  const toggle = (key: keyof FindOptions) =>
    setOptions((o) => ({ ...o, [key]: !o[key] }));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') {
      if (e.shiftKey) onPrev();
      else onNext();
    }
  };

  return (
    <div className="find-replace" role="dialog" aria-label="Find and Replace">
      {/* Header */}
      <div className="find-replace__header">
        <button
          className="find-replace__toggle"
          onClick={() => setShowReplace((v) => !v)}
          aria-label="Toggle replace"
          title="Toggle replace"
        >
          {showReplace ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <span className="find-replace__title">{showReplace ? 'Find & Replace' : 'Find'}</span>
        <button className="icon-btn icon-btn--xs" onClick={onClose} aria-label="Close">
          <X size={13} />
        </button>
      </div>

      {/* Find row */}
      <div className="find-replace__row">
        <input
          ref={inputRef}
          className="find-replace__input"
          placeholder="Find…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Find text"
          id="find-input"
        />
        <span className="find-replace__count">
          {query && matchCount > 0
            ? `${currentMatch + 1}/${matchCount}`
            : query
            ? '0 results'
            : ''}
        </span>
        <button className="icon-btn icon-btn--xs" onClick={onPrev} title="Previous (Shift+Enter)" aria-label="Previous match">
          <ChevronUp size={13} />
        </button>
        <button className="icon-btn icon-btn--xs" onClick={onNext} title="Next (Enter)" aria-label="Next match">
          <ChevronDown size={13} />
        </button>
      </div>

      {/* Options */}
      <div className="find-replace__options">
        {(['caseSensitive', 'regex', 'wholeWord'] as const).map((key) => (
          <button
            key={key}
            className={`find-opt-btn ${options[key] ? 'find-opt-btn--active' : ''}`}
            onClick={() => toggle(key)}
            title={key === 'caseSensitive' ? 'Case sensitive' : key === 'regex' ? 'Regex' : 'Whole word'}
            aria-pressed={options[key]}
          >
            {key === 'caseSensitive' ? 'Aa' : key === 'regex' ? '.*' : 'W'}
          </button>
        ))}
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="find-replace__row">
          <input
            className="find-replace__input"
            placeholder="Replace with…"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            aria-label="Replace text"
            id="replace-input"
          />
          <button
            className="icon-btn icon-btn--xs find-replace__replace-btn"
            onClick={() => onReplace(replacement)}
            title="Replace"
            aria-label="Replace"
          >
            <Replace size={13} />
          </button>
          <button
            className="find-replace__btn"
            onClick={() => onReplaceAll(replacement)}
            title="Replace all"
            aria-label="Replace all"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
};
