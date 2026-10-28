# RexMD — Modern Markdown Editor

A blazing-fast, professional Markdown editor built with Vite + React + TypeScript, deployable to Cloudflare Pages.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vite 6 + React 19 + TypeScript |
| Editor | CodeMirror 6 (full extension suite) |
| Markdown | marked + marked-highlight |
| Syntax | highlight.js (100+ languages) |
| Preview CSS | github-markdown-css (dark) |
| Icons | lucide-react |
| Deploy | Cloudflare Pages |
| Storage | localStorage (no backend needed) |

## Features

- 📱 **Two-Way P2P QR Code Sync (PC ↔ Mobile)**: Pair PC and phone via a QR camera scan using WebRTC DataChannels. Bidirectional live sync merges notes both ways without saving to any server.
- ⚡ **Flagship CodeMirror 6 Editor**: Line numbers, active line highlight, bracket matching, code folding, autocompletion, drop cursor, and rectangular selection.
- 👁️ **Flexible View Modes**: Split-pane, Editor-only, Preview-only, and Zen Mode (distraction-free writing).
- 🔄 **Bidirectional Synchronized Scrolling**: Editor and preview move seamlessly in sync.
- 🔍 **Interactive Find & Replace (`Ctrl+H`)**: Live match counter, regex, case sensitivity, whole word, next/previous match, and replace all.
- 🔤 **Dynamic Font Sizing (`Ctrl+=` / `Ctrl+-`)**: Scale editor text smoothly from 11px to 28px without reloading.
- 📊 **Detailed Document Statistics**: Word count, character count (with & without spaces), lines, paragraphs, sentences, and estimated reading time.
- 📜 **Version History & Restore**: Automatic snapshots saved every 30 seconds with 1-click version restore.
- 🏷️ **Tagging & Pinning System**: Organize documents with colorful tags and pin key notes to the top.
- 💾 **Local-First & Offline Ready**: Auto-saves instantly to `localStorage` with no account or backend needed.
- 📥 **Import & Export**: Download `.md` files or import existing Markdown files directly.
- 📋 **Copy as HTML**: 1-click render and copy formatted HTML to clipboard.
- 🖼️ **Image Paste**: Paste images directly from clipboard into the editor as markdown embedded images.
- 🔔 **Toast Notification System**: Instant feedback for imports, exports, copies, and version restorations.
- 🚀 **Cloudflare Pages Ready**: Zero-config deployment with `_redirects` SPA fallback and `wrangler.toml`.

## Development

```bash
npm install
npm run dev
```

## Deploy to Cloudflare Pages

1. Push this repo to GitHub
2. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
3. Connect your repository
4. Set build configuration:
   - **Framework preset:** `Vite` (or None)
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
5. Click **Save and Deploy**!

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+K` | Link |
| `Ctrl+\`` | Inline code |
| `Ctrl+1` | Heading 1 |
| `Ctrl+2` | Heading 2 |
| `Ctrl+3` | Heading 3 |
| `Ctrl+H` | Find & Replace |
| `F11` | Toggle Zen Mode |
| `Ctrl+=` / `Ctrl++` | Increase font size |
| `Ctrl+-` | Decrease font size |
| `Ctrl+N` | New document |
| `Ctrl+\` | Toggle sidebar |
| `Ctrl+S` | Save / mark saved |

