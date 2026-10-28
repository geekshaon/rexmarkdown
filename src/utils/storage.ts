import type { Document } from '../types';

const STORAGE_KEY = 'rexmd_documents';
const ACTIVE_KEY  = 'rexmd_active';

export function loadDocuments(): Document[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDocuments(docs: Document[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

export function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export function readingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function createDefaultDocument(): Document {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: 'Untitled Document',
    content: `# Welcome to RexMD 🚀

A blazing-fast, modern Markdown editor built for developers.

## Features

- **Split-pane** editing with live preview
- **GitHub-flavored** Markdown rendering
- **Syntax highlighting** for 100+ languages
- **Multiple documents** with localStorage persistence
- **Word count** & reading time tracker
- **Zen mode** for distraction-free writing
- **Find & Replace**, scroll sync, image paste, and more!

## Quick Markdown Guide

### Text Formatting

**Bold**, *italic*, ~~strikethrough~~, \`inline code\`

### Code Blocks

\`\`\`typescript
const greet = (name: string): string => {
  return \`Hello, \${name}!\`;
};
console.log(greet('RexMD'));
\`\`\`

### Tables

| Feature | Status |
|---------|--------|
| Split pane | ✅ |
| GFM support | ✅ |
| Dark mode | ✅ |
| Zen mode | ✅ |

### Task Lists

- [x] Create awesome editor
- [x] Add live preview
- [x] Add zen mode
- [ ] Rule the world

> **Tip:** Press \`F11\` or use the toolbar for Zen mode. Paste images directly into the editor!
`,
    createdAt: now,
    updatedAt: now,
    wordCount: 0,
    pinned: false,
    tags: [],
    snapshots: [],
  };
}
