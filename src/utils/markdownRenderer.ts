import { marked } from 'marked';

marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    html() {
      return '';
    }
  }
});

export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown, {
    async: false,
  }) as string;
}

