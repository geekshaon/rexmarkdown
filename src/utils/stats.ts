import type { DocStats } from '../types';

export function computeStats(content: string): DocStats {
  const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
  const chars = content.length;
  const charsNoSpaces = content.replace(/\s/g, '').length;
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0).length;
  const lines = content.split('\n').length;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  return { words, chars, charsNoSpaces, sentences, paragraphs, readingTime, lines };
}

export function readingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}
