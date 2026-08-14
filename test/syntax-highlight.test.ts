import { test } from 'node:test';
import assert from 'node:assert';

import { hljs, resolveLanguage } from '../src/utils/syntaxHighlight';

test('bundles the languages we advertise', () => {
  const expected = [
    'bash', 'c', 'cpp', 'csharp', 'css', 'go', 'java', 'javascript',
    'json', 'kotlin', 'markdown', 'php', 'plaintext', 'python', 'ruby',
    'rust', 'sql', 'swift', 'typescript', 'xml', 'yaml',
  ];

  for (const language of expected) {
    assert.ok(hljs.getLanguage(language), `${language} should be registered`);
  }
});

test('resolves the language class marked emits for fenced blocks', () => {
  assert.strictEqual(resolveLanguage(['language-javascript']), 'javascript');
  assert.strictEqual(resolveLanguage(['hljs', 'language-python']), 'python');
  assert.strictEqual(resolveLanguage(['lang-sql']), 'sql');
  assert.strictEqual(resolveLanguage(['language-JavaScript']), 'javascript');
});

test('resolves aliases registered by the language definitions', () => {
  assert.strictEqual(resolveLanguage(['language-js']), 'js');
  assert.strictEqual(resolveLanguage(['language-ts']), 'ts');
  assert.strictEqual(resolveLanguage(['language-py']), 'py');
  assert.strictEqual(resolveLanguage(['language-sh']), 'sh');
  assert.strictEqual(resolveLanguage(['language-html']), 'html');
});

test('returns null for blocks we should leave as plain text', () => {
  // No language on the fence at all
  assert.strictEqual(resolveLanguage([]), null);
  assert.strictEqual(resolveLanguage(['hljs']), null);
  // A language we deliberately do not bundle
  assert.strictEqual(resolveLanguage(['language-brainfuck']), null);
  // Unrelated classes must not be mistaken for a language
  assert.strictEqual(resolveLanguage(['markdown-content', 'show-answer-text']), null);
});

test('emits token markup the stylesheet targets', () => {
  const { value } = hljs.highlight('const answer = 42;', { language: 'javascript' });

  assert.match(value, /hljs-keyword/);
  assert.match(value, /hljs-number/);
});

test('escapes HTML in code blocks rather than emitting it', () => {
  const { value } = hljs.highlight('<img src=x onerror=alert(1)>', { language: 'xml' });

  assert.ok(!value.includes('<img'), 'raw tag must not survive highlighting');
  assert.match(value, /&lt;/);
});
