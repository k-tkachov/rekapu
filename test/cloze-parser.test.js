/**
 * Cloze Parser Tests (REAL Implementation)
 * 
 * This test suite validates the actual Anki-style cloze deletion parser
 * from src/utils/clozeParser.ts
 * 
 * Testing Strategy:
 * - Imports and tests the REAL production cloze parsing functions
 * - Validates actual regex pattern matching and text processing
 * - Tests real card generation and text masking logic
 * - All assertions based on actual parser behavior, not hardcoded assumptions
 * 
 * Key Implementation Details Verified:
 * - Regex pattern: {{cN::text::hint}} format detection
 * - Empty cloze detection: requires non-whitespace content
 * - Card generation: creates individual cards for each deletion
 * - Text masking: replaces specific deletions with placeholders
 * 
 * This replaces previous hardcoded regex patterns and basic assertions.
 * Tests the ACTUAL cloze parser used by the application.
 */

const test = require('node:test');
const assert = require('node:assert');

// Import the ACTUAL cloze parser implementation
const tsnode = require('ts-node');
tsnode.register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const {
  parseClozeText,
  renderClozeWithMask,
  generateClozeCards,
  validateClozeText
} = require('../src/utils/clozeParser.ts');

test('Cloze Parser (REAL Implementation)', async (t) => {
  await t.test('parseClozeText', async (t) => {
    await t.test('should parse simple cloze deletion', () => {
      const text = 'Paris is the {{c1::capital}} of France.';
      const result = parseClozeText(text);
      
      assert.strictEqual(result.hasClozeDeletions, true, 'Should detect cloze deletions');
      assert.strictEqual(result.deletions.length, 1, 'Should find one deletion');
      assert.strictEqual(result.deletions[0].id, 1, 'Should have correct ID');
      assert.strictEqual(result.deletions[0].text, 'capital', 'Should have correct text');
      assert.strictEqual(result.deletions[0].hint, undefined, 'Should have no hint');
      assert.strictEqual(result.cleanText, 'Paris is the capital of France.', 'Should have clean text');
      assert.strictEqual(result.errors.length, 0, 'Should have no errors');
    });

    await t.test('should parse cloze deletion with hint', () => {
      const text = 'The {{c1::Seine::river}} flows through Paris.';
      const result = parseClozeText(text);
      
      assert.strictEqual(result.hasClozeDeletions, true, 'Should detect cloze deletions');
      assert.strictEqual(result.deletions.length, 1, 'Should find one deletion');
      assert.strictEqual(result.deletions[0].id, 1, 'Should have correct ID');
      assert.strictEqual(result.deletions[0].text, 'Seine', 'Should have correct text');
      assert.strictEqual(result.deletions[0].hint, 'river', 'Should have correct hint');
      assert.strictEqual(result.cleanText, 'The Seine flows through Paris.', 'Should have clean text');
    });

    await t.test('should parse multiple cloze deletions', () => {
      const text = '{{c1::Paris}} is the capital of {{c2::France}}.';
      const result = parseClozeText(text);
      
      assert.strictEqual(result.hasClozeDeletions, true, 'Should detect cloze deletions');
      assert.strictEqual(result.deletions.length, 2, 'Should find two deletions');
      assert.strictEqual(result.deletions[0].id, 1, 'First deletion should have ID 1');
      assert.strictEqual(result.deletions[0].text, 'Paris', 'First deletion should have correct text');
      assert.strictEqual(result.deletions[1].id, 2, 'Second deletion should have ID 2');
      assert.strictEqual(result.deletions[1].text, 'France', 'Second deletion should have correct text');
      assert.strictEqual(result.cleanText, 'Paris is the capital of France.', 'Should have clean text');
    });

    await t.test('should handle text with no cloze deletions', () => {
      const text = 'Paris is the capital of France.';
      const result = parseClozeText(text);
      
      assert.strictEqual(result.hasClozeDeletions, false, 'Should not detect cloze deletions');
      assert.strictEqual(result.deletions.length, 0, 'Should find no deletions');
      assert.strictEqual(result.cleanText, text, 'Clean text should be same as input');
      assert.strictEqual(result.errors.length, 0, 'Should have no errors');
    });
  });

  await t.test('cloze validation', async (t) => {
    await t.test('should detect invalid cloze ID range', () => {
      const text = '{{c0::Paris}} and {{c21::France}}.';
      const result = parseClozeText(text);
      
      assert.strictEqual(result.hasClozeDeletions, false, 'Should not have valid deletions');
      assert.strictEqual(result.deletions.length, 0, 'Should find no valid deletions');
      assert.strictEqual(result.errors.length, 2, 'Should have two errors');
      assert.ok(result.errors.some(e => e.includes('c0')), 'Should detect c0 as invalid');
      assert.ok(result.errors.some(e => e.includes('c21')), 'Should detect c21 as invalid');
    });

    await t.test('should detect duplicate cloze IDs', () => {
      const text = '{{c1::Paris}} is the capital of {{c1::France}}.';
      const result = parseClozeText(text);
      
      assert.strictEqual(result.hasClozeDeletions, true, 'Should detect some cloze deletions');
      assert.strictEqual(result.deletions.length, 1, 'Should only accept first occurrence');
      assert.strictEqual(result.errors.length, 1, 'Should have one error');
      assert.ok(result.errors[0].includes('Duplicate cloze ID: c1'), 'Should detect duplicate ID');
    });

    await t.test('should not match invalid cloze syntax', () => {
      const text = 'The capital is {{c1::}}.';
      const result = parseClozeText(text);
      
      assert.strictEqual(result.hasClozeDeletions, false, 'Should not have valid deletions');
      assert.strictEqual(result.deletions.length, 0, 'Should find no valid deletions');
      assert.strictEqual(result.errors.length, 0, 'Should have no errors since regex doesn\'t match');
      assert.strictEqual(result.cleanText, text, 'Clean text should be unchanged since no valid cloze patterns');
    });

    await t.test('should detect empty cloze text after regex match', () => {
      // Test with whitespace-only text which matches the regex but gets trimmed to empty
      const text = 'The capital is {{c1::   }}.';
      const result = parseClozeText(text);
      
      assert.strictEqual(result.hasClozeDeletions, false, 'Should not have valid deletions');
      assert.strictEqual(result.deletions.length, 0, 'Should find no valid deletions');
      assert.strictEqual(result.errors.length, 1, 'Should have one error');
      assert.ok(result.errors[0].includes('Empty cloze text'), 'Should detect empty text after trim');
    });
  });

  await t.test('cloze rendering', async (t) => {
    await t.test('should mask specific deletion', () => {
      const text = '{{c1::Paris}} is the capital of {{c2::France}}.';
      const maskedText = renderClozeWithMask(text, 1);
      
      assert.strictEqual(maskedText, '[...] is the capital of France.', 'Should mask only the first deletion');
    });

    await t.test('should show hint when available', () => {
      const text = 'The {{c1::Seine::river}} flows through {{c2::Paris}}.';
      const maskedText = renderClozeWithMask(text, 1);
      
      assert.strictEqual(maskedText, 'The [...] (river) flows through Paris.', 'Should show hint with masked deletion');
    });

    await t.test('should use custom placeholder', () => {
      const text = '{{c1::Paris}} is the capital of {{c2::France}}.';
      const maskedText = renderClozeWithMask(text, 1, '[BLANK]');
      
      assert.strictEqual(maskedText, '[BLANK] is the capital of France.', 'Should use custom placeholder');
    });
  });

  await t.test('generateClozeCards', async (t) => {
    await t.test('should generate individual cards for each deletion', () => {
      const text = '{{c1::Paris}} is the capital of {{c2::France}}.';
      const cards = generateClozeCards('card-123', text);
      
      assert.strictEqual(cards.length, 2, 'Should generate two cards');
      
      // First card (c1)
      assert.strictEqual(cards[0].id, 'card-123::c1', 'Should have correct card ID');
      assert.strictEqual(cards[0].cardText, '[...] is the capital of France.', 'Should mask first deletion');
      assert.strictEqual(cards[0].answer, 'Paris', 'Should have correct answer');
      assert.strictEqual(cards[0].deletionId, 1, 'Should have correct deletion ID');
      
      // Second card (c2)
      assert.strictEqual(cards[1].id, 'card-123::c2', 'Should have correct card ID');
      assert.strictEqual(cards[1].cardText, 'Paris is the capital of [...].', 'Should mask second deletion');
      assert.strictEqual(cards[1].answer, 'France', 'Should have correct answer');
      assert.strictEqual(cards[1].deletionId, 2, 'Should have correct deletion ID');
    });

    await t.test('should include hints in generated cards', () => {
      const text = 'The {{c1::Seine::river}} flows through {{c2::Paris::city}}.';
      const cards = generateClozeCards('card-456', text);
      
      assert.strictEqual(cards.length, 2, 'Should generate two cards');
      assert.strictEqual(cards[0].hint, 'river', 'First card should have hint');
      assert.strictEqual(cards[1].hint, 'city', 'Second card should have hint');
    });

    await t.test('should return empty array for text without cloze deletions', () => {
      const text = 'Paris is the capital of France.';
      const cards = generateClozeCards('card-789', text);
      
      assert.strictEqual(cards.length, 0, 'Should return empty array');
    });
  });

  await t.test('validateClozeText', async (t) => {
    await t.test('should validate correct cloze text', () => {
      const text = '{{c1::Paris}} is the capital of {{c2::France}}.';
      const result = validateClozeText(text);
      
      assert.strictEqual(result.isValid, true, 'Should be valid');
      assert.strictEqual(result.errors.length, 0, 'Should have no errors');
    });

    await t.test('should reject text with errors', () => {
      const text = '{{c1::Paris}} and {{c1::France}}.'; // Duplicate ID
      const result = validateClozeText(text);
      
      assert.strictEqual(result.isValid, false, 'Should be invalid');
      assert.strictEqual(result.errors.length, 1, 'Should have one error');
    });

    await t.test('should reject text without cloze deletions', () => {
      const text = 'Paris is the capital of France.';
      const result = validateClozeText(text);
      
      assert.strictEqual(result.isValid, false, 'Should be invalid');
      assert.strictEqual(result.errors.length, 0, 'Should have no errors but no deletions');
    });
  });
});
