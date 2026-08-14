/**
 * Webpack entry that exposes the shared highlighter to blocked.js.
 *
 * blocked.html is a plain page loading classic scripts, so it can't import the
 * module directly. Building it as an entry here rather than hand-vendoring a
 * prebuilt file keeps one copy of highlight.js and one language list across
 * both render paths.
 */
import { highlightCodeBlocks } from './utils/syntaxHighlight';

declare global {
  interface Window {
    rekapuHighlightCodeBlocks?: typeof highlightCodeBlocks;
  }
}

window.rekapuHighlightCodeBlocks = highlightCodeBlocks;

export {};
