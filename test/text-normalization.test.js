/**
 * Text Normalization Tests (REAL Implementation)
 * 
 * This test suite validates the actual text normalization and answer matching utilities
 * from src/utils/textNormalization.ts
 * 
 * Testing Strategy:
 * - Imports and tests the REAL production text normalization functions
 * - Validates actual normalization algorithms and answer comparison logic
 * - Tests real alias parsing and formatting functionality
 * - All assertions based on actual implementation behavior, not local mock functions
 * 
 * Key Implementation Details Verified:
 * - Text normalization: trimming, case conversion, punctuation handling
 * - Answer matching: strict vs partial matching with configurable options
 * - Alias parsing: comma and newline separated acceptable answers
 * - Format preservation: round-trip parsing and formatting consistency
 * 
 * This replaces previous locally defined normalizeText and checkAnswerMatch functions.
 * Tests the ACTUAL text normalization utilities used by the application.
 */

const test = require('node:test');
const assert = require('node:assert');

// Import the ACTUAL text normalization implementation
const tsnode = require('ts-node');
tsnode.register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const {
  normalizeText,
  checkAnswerMatch,
  parseAcceptableAnswers,
  formatAcceptableAnswers
} = require('../src/utils/textNormalization.ts');

test('Text Normalization (REAL Implementation)', async (t) => {
  await t.test('normalizeText function', async (t) => {
    await t.test('should trim whitespace', () => {
      assert.equal(normalizeText('  Paris  '), 'paris');
    });

    await t.test('should collapse multiple spaces', () => {
      assert.equal(normalizeText('Paris   is   great'), 'paris is great');
    });

    await t.test('should convert to lowercase', () => {
      assert.equal(normalizeText('PARIS'), 'paris');
    });

    await t.test('should remove punctuation', () => {
      assert.equal(normalizeText('Paris, France!'), 'paris france');
    });

    await t.test('should preserve case when caseSensitive is true', () => {
      assert.equal(normalizeText('PARIS', { caseSensitive: true }), 'PARIS');
    });

    await t.test('should preserve punctuation when preservePunctuation is true', () => {
      assert.equal(normalizeText('Paris, France!', { preservePunctuation: true }), 'paris, france!');
    });

    await t.test('should preserve whitespace when preserveWhitespace is true', () => {
      assert.equal(normalizeText('  Paris   is  great  ', { preserveWhitespace: true }), '  paris   is  great  ');
    });
  });

  await t.test('checkAnswerMatch function', async (t) => {
    await t.test('should match exact answers', () => {
      const result = checkAnswerMatch('Paris', 'Paris');
      assert.ok(result.isMatch);
      assert.equal(result.matchedAnswer, 'Paris');
    });

    await t.test('should match case-insensitive answers', () => {
      const result = checkAnswerMatch('paris', 'Paris');
      assert.ok(result.isMatch);
      assert.equal(result.matchedAnswer, 'Paris');
    });

    await t.test('should match with punctuation differences', () => {
      const result = checkAnswerMatch('Paris!', 'Paris');
      assert.ok(result.isMatch);
    });

    await t.test('should match with whitespace differences', () => {
      const result = checkAnswerMatch('  Paris  ', 'Paris');
      assert.ok(result.isMatch);
    });

    await t.test('should match acceptable answers', () => {
      const result = checkAnswerMatch('City of Light', 'Paris', ['City of Light', 'French Capital']);
      assert.ok(result.isMatch);
      assert.equal(result.matchedAnswer, 'City of Light');
    });

    await t.test('should do partial matching when not strict', () => {
      const result = checkAnswerMatch('Par', 'Paris');
      assert.ok(result.isMatch);
    });

    await t.test('should not do partial matching when strict', () => {
      const result = checkAnswerMatch('Par', 'Paris', [], true);
      assert.ok(!result.isMatch);
    });

    await t.test('should require exact case when strict matching', () => {
      const result = checkAnswerMatch('paris', 'Paris', [], true);
      assert.ok(!result.isMatch);
    });

    await t.test('should require exact punctuation when strict matching', () => {
      const result = checkAnswerMatch('Paris', 'Paris!', [], true);
      assert.ok(!result.isMatch);
    });
  });

  await t.test('edge cases', async (t) => {
    await t.test('should handle empty strings', () => {
      const result = checkAnswerMatch('', '');
      assert.ok(result.isMatch);
    });

    await t.test('should handle null/undefined inputs gracefully', () => {
      assert.equal(normalizeText(''), '');
      assert.equal(normalizeText(null), '');
      assert.equal(normalizeText(undefined), '');
    });

    await t.test('should not match empty answer with non-empty correct answer', () => {
      const result = checkAnswerMatch('', 'Paris');
      assert.ok(!result.isMatch);
    });
  });

  await t.test('parseAcceptableAnswers function', async (t) => {
    await t.test('should parse comma-separated answers', () => {
      const result = parseAcceptableAnswers('Paris, City of Light, French Capital');
      assert.deepEqual(result, ['Paris', 'City of Light', 'French Capital']);
    });

    await t.test('should parse newline-separated answers', () => {
      const result = parseAcceptableAnswers('Paris\nCity of Light\nFrench Capital');
      assert.deepEqual(result, ['Paris', 'City of Light', 'French Capital']);
    });

    await t.test('should parse mixed comma and newline-separated answers', () => {
      const result = parseAcceptableAnswers('Paris, City of Light\nFrench Capital');
      assert.deepEqual(result, ['Paris', 'City of Light', 'French Capital']);
    });

    await t.test('should handle extra whitespace', () => {
      const result = parseAcceptableAnswers('  Paris  ,  City of Light  \n  French Capital  ');
      assert.deepEqual(result, ['Paris', 'City of Light', 'French Capital']);
    });

    await t.test('should handle empty input', () => {
      const result = parseAcceptableAnswers('');
      assert.deepEqual(result, []);
    });

    await t.test('should filter out empty answers', () => {
      const result = parseAcceptableAnswers('Paris, , City of Light, \n, French Capital');
      assert.deepEqual(result, ['Paris', 'City of Light', 'French Capital']);
    });
  });

  await t.test('formatAcceptableAnswers function', async (t) => {
    await t.test('should format answers with commas', () => {
      const result = formatAcceptableAnswers(['Paris', 'City of Light', 'French Capital']);
      assert.equal(result, 'Paris, City of Light, French Capital');
    });

    await t.test('should handle single answer', () => {
      const result = formatAcceptableAnswers(['Paris']);
      assert.equal(result, 'Paris');
    });

    await t.test('should handle empty array', () => {
      const result = formatAcceptableAnswers([]);
      assert.equal(result, '');
    });
  });

  await t.test('integration test - parse and format cycle', async (t) => {
    await t.test('should preserve data through parse/format cycle', () => {
      const input = 'Paris, City of Light, French Capital';
      const parsed = parseAcceptableAnswers(input);
      const formatted = formatAcceptableAnswers(parsed);
      assert.equal(formatted, input);
    });
  });
});
