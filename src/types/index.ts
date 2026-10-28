export interface DocSnapshot {
  content: string;
  savedAt: number;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  pinned?: boolean;
  tags?: string[];
  snapshots?: DocSnapshot[]; // up to 20 history snapshots
}

export type LayoutMode = 'split' | 'editor' | 'preview' | 'zen';

export interface AppSettings {
  fontSize: number;        // editor font size in px (12–24)
  scrollSync: boolean;     // sync editor/preview scroll
  zenMode: boolean;
}

export interface AppState {
  documents: Document[];
  activeDocId: string | null;
  layoutMode: LayoutMode;
  sidebarOpen: boolean;
  settings: AppSettings;
}

export interface DocStats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: number;
  lines: number;
}
