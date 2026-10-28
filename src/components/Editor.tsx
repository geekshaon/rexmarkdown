import React, { useEffect, useRef, useCallback } from 'react';
import {
  EditorView, keymap, lineNumbers, highlightActiveLineGutter,
  drawSelection, rectangularSelection, crosshairCursor, dropCursor,
  highlightSpecialChars,
} from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import {
  defaultKeymap, history, historyKeymap, indentWithTab,
} from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  syntaxHighlighting, defaultHighlightStyle, bracketMatching,
  foldGutter, indentOnInput,
} from '@codemirror/language';
import {
  closeBrackets, closeBracketsKeymap,
  autocompletion, completionKeymap,
} from '@codemirror/autocomplete';
import {
  search, searchKeymap, highlightSelectionMatches,
  SearchQuery, setSearchQuery, getSearchQuery, findNext, findPrevious,
  replaceNext, replaceAll,
} from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';

export interface EditorApi {
  find: (query: string, opts: { caseSensitive: boolean; regex: boolean; wholeWord: boolean }) => { count: number; current: number };
  findNext: () => { count: number; current: number };
  findPrev: () => { count: number; current: number };
  replace: (replacement: string) => { count: number; current: number };
  replaceAll: (replacement: string) => { count: number; current: number };
  format: (type: string) => void;
  insertImage: (dataUrl: string) => void;
  focus: () => void;
  blur: () => void;
  scrollCursorIntoView: (yMargin?: number) => void;
}

interface EditorProps {
  content: string;
  fontSize: number;
  onChange: (value: string) => void;
  onFormat?: (fn: (type: string) => void) => void;
  onScrollPct?: (pct: number) => void; // for scroll sync
  onViewReady?: (view: EditorView) => void;
  onImagePaste?: (dataUrl: string) => void;
  onEditorApi?: (api: EditorApi) => void;
  onFocusChange?: (focused: boolean) => void;
}

// ─── Format helpers ─────────────────────────────────────────────────────────
function wrapSelection(view: EditorView, before: string, after: string, placeholder: string) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const text = selected || placeholder;
  view.dispatch({
    changes: { from, to, insert: `${before}${text}${after}` },
    selection: { anchor: from + before.length, head: from + before.length + text.length },
  });
  view.focus();
}

function insertLine(view: EditorView, prefix: string) {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  view.dispatch({
    changes: { from: line.from, to: line.from, insert: prefix },
  });
  view.focus();
}

function insertSnippet(view: EditorView, snippet: string) {
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: snippet },
    selection: { anchor: from + snippet.length },
  });
  view.focus();
}

const FORMAT_HANDLERS: Record<string, (view: EditorView) => void> = {
  bold:   (v) => wrapSelection(v, '**', '**', 'bold text'),
  italic: (v) => wrapSelection(v, '*', '*', 'italic text'),
  code:   (v) => wrapSelection(v, '`', '`', 'code'),
  quote:  (v) => insertLine(v, '> '),
  h1:     (v) => insertLine(v, '# '),
  h2:     (v) => insertLine(v, '## '),
  h3:     (v) => insertLine(v, '### '),
  ul:     (v) => insertLine(v, '- '),
  ol:     (v) => insertLine(v, '1. '),
  hr:     (v) => insertSnippet(v, '\n---\n'),
  link:   (v) => wrapSelection(v, '[', '](url)', 'link text'),
  image:  (v) => insertSnippet(v, '![alt text](image-url)'),
  task:   (v) => insertLine(v, '- [ ] '),
  table:  (v) => insertSnippet(v, '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n'),
};

// Custom RexMD theme
function buildTheme(fontSize: number) {
  return EditorView.theme(
    {
      '&': { height: '100%', fontSize: `${fontSize}px`, fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
      '.cm-content': {
        padding: '18px 20px min(60vh, 480px) 20px',
        caretColor: '#c678dd',
        minHeight: '100%',
      },
      '.cm-focused': { outline: 'none' },
      '.cm-editor': { height: '100%' },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'inherit',
        scrollBehavior: 'smooth',
        overscrollBehaviorY: 'contain',
      },
      '.cm-line': { lineHeight: '1.75' },
      '.cm-cursor': { borderLeftColor: '#c678dd', borderLeftWidth: '2px' },
      '.cm-gutters': { background: '#1a1d27', borderRight: '1px solid #2a2d3a', color: '#4b5264' },
      '.cm-activeLineGutter': { background: '#22253320' },
      '.cm-activeLine': { background: '#22253318' },
      '.cm-selectionBackground': { background: '#3d4463 !important' },
      '&.cm-focused .cm-selectionBackground': { background: '#3d4463 !important' },
      '.cm-foldGutter': { width: '14px' },
      '.cm-searchMatch': { background: '#fbbf2440', border: '1px solid #fbbf24' },
      '.cm-searchMatch.cm-searchMatch-selected': { background: '#f59e0b60' },
    },
    { dark: true }
  );
}

export const Editor: React.FC<EditorProps> = ({
  content,
  fontSize,
  onChange,
  onFormat,
  onScrollPct,
  onViewReady,
  onImagePaste,
  onEditorApi,
  onFocusChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isExternal = useRef(false);
  const themeCompartment = useRef<Compartment | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  // Expose format handler to parent
  useEffect(() => {
    if (onFormat) {
      onFormat((type: string) => {
        const view = viewRef.current;
        if (!view) return;
        FORMAT_HANDLERS[type]?.(view);
      });
    }
  }, [onFormat]);

  // Init editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const themeComp = new Compartment();
    themeCompartment.current = themeComp;

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightSelectionMatches(),
        search({ top: false }),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          ...lintKeymap,
          indentWithTab,
        ]),
        markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
        oneDark,
        themeComp.of(buildTheme(fontSize)),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternal.current) {
            onChange(update.state.doc.toString());
          }
          // If the user typed or doc changed while focused, keep cursor visible above keyboard
          if (update.docChanged && update.view.hasFocus) {
            const head = update.state.selection.main.head;
            if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
            scrollRafRef.current = requestAnimationFrame(() => {
              if (viewRef.current && viewRef.current.hasFocus) {
                viewRef.current.dispatch({
                  effects: EditorView.scrollIntoView(head, { y: 'nearest', yMargin: 80 }),
                });
              }
            });
          }
        }),
        EditorView.lineWrapping,
        // Scroll & focus listener
        EditorView.domEventHandlers({
          focus(_event, view) {
            onFocusChange?.(true);
            // When opening virtual keyboard on mobile, keyboard animation takes 250-320ms
            setTimeout(() => {
              if (view.hasFocus) {
                const head = view.state.selection.main.head;
                view.dispatch({
                  effects: EditorView.scrollIntoView(head, { y: 'center', yMargin: 90 }),
                });
              }
            }, 300);
          },
          blur(_event) {
            onFocusChange?.(false);
          },
          scroll(_event, view) {
            if (!onScrollPct) return;
            const el = view.scrollDOM;
            const pct = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
            onScrollPct(pct);
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    onViewReady?.(view);

    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update font size dynamically
  useEffect(() => {
    const view = viewRef.current;
    const comp = themeCompartment.current;
    if (!view || !comp) return;
    view.dispatch({ effects: comp.reconfigure(buildTheme(fontSize)) });
  }, [fontSize]);

  // Sync external content (doc switch)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (cur !== content) {
      isExternal.current = true;
      view.dispatch({ changes: { from: 0, to: cur.length, insert: content } });
      isExternal.current = false;
    }
  }, [content]);

  // Image paste handler
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find((i) => i.type.startsWith('image/'));
    if (!imgItem || !onImagePaste) return;
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onImagePaste(dataUrl);
      // Insert as markdown image
      const view = viewRef.current;
      if (view) {
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: `![pasted-image](${dataUrl})` },
        });
      }
    };
    reader.readAsDataURL(file);
  }, [onImagePaste]);

  // Helper to compute match counts
  const computeMatchInfo = useCallback((view: EditorView, sq: SearchQuery) => {
    if (!sq.valid || !sq.search) return { count: 0, current: 0 };
    let count = 0;
    let current = 0;
    const selFrom = view.state.selection.main.from;
    try {
      const cursor = sq.getCursor(view.state);
      let item = cursor.next();
      while (!item.done) {
        if (item.value.from <= selFrom && item.value.to >= selFrom) {
          current = count;
        }
        count++;
        if (count >= 1000) break;
        item = cursor.next();
      }
    } catch {
      // ignore regex/cursor syntax errors
    }
    return { count, current };
  }, []);

  const doFind = useCallback((query: string, opts: { caseSensitive: boolean; regex: boolean; wholeWord: boolean }) => {
    const view = viewRef.current;
    if (!view) return { count: 0, current: 0 };
    const sq = new SearchQuery({
      search: query,
      caseSensitive: opts.caseSensitive,
      regexp: opts.regex,
      wholeWord: opts.wholeWord,
    });
    view.dispatch({ effects: setSearchQuery.of(sq) });
    if (query) findNext(view);
    return computeMatchInfo(view, sq);
  }, [computeMatchInfo]);

  const doFindNext = useCallback(() => {
    const view = viewRef.current;
    if (!view) return { count: 0, current: 0 };
    findNext(view);
    const sq = getSearchQuery(view.state);
    return computeMatchInfo(view, sq);
  }, [computeMatchInfo]);

  const doFindPrev = useCallback(() => {
    const view = viewRef.current;
    if (!view) return { count: 0, current: 0 };
    findPrevious(view);
    const sq = getSearchQuery(view.state);
    return computeMatchInfo(view, sq);
  }, [computeMatchInfo]);

  const doReplace = useCallback((replacement: string) => {
    const view = viewRef.current;
    if (!view) return { count: 0, current: 0 };
    const curSq = getSearchQuery(view.state);
    if (!curSq.search) return { count: 0, current: 0 };
    const newSq = new SearchQuery({
      search: curSq.search,
      replace: replacement,
      caseSensitive: curSq.caseSensitive,
      regexp: curSq.regexp,
      wholeWord: curSq.wholeWord,
    });
    view.dispatch({ effects: setSearchQuery.of(newSq) });
    replaceNext(view);
    return computeMatchInfo(view, newSq);
  }, [computeMatchInfo]);

  const doReplaceAll = useCallback((replacement: string) => {
    const view = viewRef.current;
    if (!view) return { count: 0, current: 0 };
    const curSq = getSearchQuery(view.state);
    if (!curSq.search) return { count: 0, current: 0 };
    const newSq = new SearchQuery({
      search: curSq.search,
      replace: replacement,
      caseSensitive: curSq.caseSensitive,
      regexp: curSq.regexp,
      wholeWord: curSq.wholeWord,
    });
    view.dispatch({ effects: setSearchQuery.of(newSq) });
    replaceAll(view);
    return { count: 0, current: 0 };
  }, []);

  const doFormat = useCallback((type: string) => {
    const view = viewRef.current;
    if (view) FORMAT_HANDLERS[type]?.(view);
  }, []);

  const doInsertImage = useCallback((dataUrl: string) => {
    const view = viewRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: `![image](${dataUrl})` },
    });
    view.focus();
  }, []);

  const doFocus = useCallback(() => {
    viewRef.current?.focus();
  }, []);

  const doBlur = useCallback(() => {
    viewRef.current?.contentDOM.blur();
  }, []);

  const doScrollCursorIntoView = useCallback((yMargin = 80) => {
    const view = viewRef.current;
    if (!view) return;
    const head = view.state.selection.main.head;
    view.dispatch({
      effects: EditorView.scrollIntoView(head, { y: 'center', yMargin }),
    });
  }, []);

  useEffect(() => {
    if (onEditorApi) {
      onEditorApi({
        find: doFind,
        findNext: doFindNext,
        findPrev: doFindPrev,
        replace: doReplace,
        replaceAll: doReplaceAll,
        format: doFormat,
        insertImage: doInsertImage,
        focus: doFocus,
        blur: doBlur,
        scrollCursorIntoView: doScrollCursorIntoView,
      });
    }
  }, [onEditorApi, doFind, doFindNext, doFindPrev, doReplace, doReplaceAll, doFormat, doInsertImage, doFocus, doBlur, doScrollCursorIntoView]);

  return (
    <div
      ref={containerRef}
      className="editor-container"
      onPaste={handlePaste}
      onFocusCapture={() => onFocusChange?.(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onFocusChange?.(false);
        }
      }}
      aria-label="Markdown editor"
    />
  );
};
