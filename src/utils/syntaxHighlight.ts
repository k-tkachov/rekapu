/*!
 * @license
 * Bundles highlight.js — BSD-3-Clause
 * Copyright (c) 2006, Ivan Sagalaev. All rights reserved.
 * https://github.com/highlightjs/highlight.js/blob/main/LICENSE
 */
import hljs from 'highlight.js/lib/core';
import type { LanguageFn } from 'highlight.js';

import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

/**
 * Languages bundled for syntax highlighting.
 *
 * Registered explicitly rather than pulling in highlight.js/lib/common so the
 * bundle only carries what we ship. Each definition also registers its own
 * aliases, so `js`, `ts`, `py`, `sh`, `html` and friends resolve for free.
 * Trim this list if the bundle needs to shrink.
 */
const LANGUAGES: Record<string, LanguageFn> = {
  bash,
  c,
  cpp,
  csharp,
  css,
  go,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  php,
  plaintext,
  python,
  ruby,
  rust,
  sql,
  swift,
  typescript,
  xml,
  yaml,
};

Object.entries(LANGUAGES).forEach(([name, definition]) => {
  hljs.registerLanguage(name, definition);
});

hljs.configure({
  // Markdown is already sanitized by the time we highlight, and the unescaped
  // HTML warning only applies to hljs.highlight() on raw strings.
  ignoreUnescapedHTML: true,
});

/**
 * Read the language of a fenced code block from the class marked emits
 * (`language-js`), falling back to the `lang-` prefix some Anki exports use.
 * Returns null when the block has no language or names one we don't bundle,
 * which leaves it rendered as plain text.
 */
export function resolveLanguage(classNames: readonly string[]): string | null {
  for (const className of classNames) {
    const match = /^(?:language|lang)-(.+)$/.exec(className);
    if (!match) continue;

    const language = match[1].toLowerCase();
    if (hljs.getLanguage(language)) return language;
  }

  return null;
}

/**
 * Syntax-highlight every fenced code block inside `root`.
 *
 * Runs against already-sanitized DOM rather than the HTML string, so the
 * highlighter's markup is never fed back through innerHTML. Blocks without a
 * recognised language are left alone: auto-detection guesses badly on the short
 * snippets that show up on flashcards.
 */
export function highlightCodeBlocks(root: ParentNode | null | undefined): void {
  if (!root) return;

  root.querySelectorAll<HTMLElement>('pre code').forEach(block => {
    if (block.dataset.highlighted === 'yes') return;

    const language = resolveLanguage(Array.from(block.classList));
    if (!language) return;

    hljs.highlightElement(block);
  });
}

export { hljs };
