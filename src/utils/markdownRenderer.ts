import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

// Configure marked with highlight.js for code syntax highlighting
const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  })
);

marked.setOptions({
  gfm: true,      // GitHub Flavored Markdown
  breaks: true,   // Convert \n to <br>
});

export function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string;
  } catch {
    return `<p>Error rendering markdown.</p>`;
  }
}
