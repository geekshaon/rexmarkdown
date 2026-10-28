import React, { useEffect, useState, useRef, useCallback } from 'react';
import { renderMarkdown } from '../utils/markdownRenderer';

interface PreviewProps {
  content: string;
  scrollPct?: number; // 0–1 for scroll sync
  onScrollPct?: (pct: number) => void;
}

export const Preview: React.FC<PreviewProps> = ({ content, scrollPct, onScrollPct }) => {
  const [html, setHtml] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    setHtml(renderMarkdown(content));
  }, [content]);

  // Receive scroll sync from editor
  useEffect(() => {
    if (scrollPct === undefined || !containerRef.current) return;
    if (isSyncingRef.current) return;
    const el = containerRef.current;
    const target = scrollPct * (el.scrollHeight - el.clientHeight);
    el.scrollTop = target;
  }, [scrollPct]);

  // Send scroll sync to editor
  const handleScroll = useCallback(() => {
    if (!onScrollPct || !containerRef.current) return;
    const el = containerRef.current;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
    isSyncingRef.current = true;
    onScrollPct(pct);
    setTimeout(() => { isSyncingRef.current = false; }, 50);
  }, [onScrollPct]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      e.preventDefault();
      const href = (target as HTMLAnchorElement).href;
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="preview-container"
      ref={containerRef}
      onClick={handleClick}
      onScroll={handleScroll}
    >
      <div
        className="markdown-body preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
