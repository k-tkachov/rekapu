/**
 * Anki Import Tests
 * 
 * Comprehensive test suite for Anki .txt import functionality
 * Tests the AnkiImporter parser and integration with BackupManager
 * 
 * Uses Node.js built-in test runner with real implementation code
 */

// TypeScript support
require('ts-node').register({
  project: './tsconfig.json',
  compilerOptions: {
    module: 'CommonJS'
  }
});

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Import real modules
const { AnkiImporter } = require('../src/utils/ankiImporter');
const { DEFAULT_SPACED_REPETITION } = require('../src/types/storage');

/**
 * Helper to create File object from fixture
 */
function loadFixture(filename) {
  const filepath = path.join(__dirname, 'fixtures', filename);
  const buffer = fs.readFileSync(filepath);
  const blob = new Blob([buffer]);
  return new File([blob], filename, { type: 'text/plain' });
}

describe('AnkiImporter - Unit Tests', () => {
  
  test('parses basic 2-column tab-separated file', async () => {
    const file = loadFixture('anki-basic-2col.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Parse should succeed');
    assert.strictEqual(result.errors.length, 0, 'Should have no errors');
    assert.ok(result.backupData, 'Should have backupData');
    
    const cards = result.backupData.data.cards;
    assert.ok(cards, 'Should have cards');
    
    const cardArray = Object.values(cards);
    assert.strictEqual(cardArray.length, 3, 'Should have 3 cards');
    
    // Check first card
    const q1 = cardArray[0];
    assert.strictEqual(q1.front, 'What is React?');
    assert.strictEqual(q1.back, 'A JavaScript library for building user interfaces');
    assert.strictEqual(q1.type, 'basic');
    assert.deepStrictEqual(q1.tags, []);
  });

  test('parses 3-column file with tags', async () => {
    const file = loadFixture('anki-basic-3col.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Parse should succeed');
    assert.ok(result.backupData, 'Should have backupData');
    
    const cards = Object.values(result.backupData.data.cards);
    assert.strictEqual(cards.length, 4, 'Should have 4 cards');
    
    // Check tags
    const q1 = cards[0];
    assert.ok(q1.tags.length > 0, 'Should have tags');
    assert.ok(q1.tags.includes('programming'), 'Should include programming tag');
    assert.ok(q1.tags.includes('react'), 'Should include react tag');
    assert.ok(q1.tags.includes('frontend'), 'Should include frontend tag');
    
    // Check tags were created
    const tags = result.backupData.data.tags;
    assert.ok(tags, 'Should have tags dictionary');
    assert.ok(tags['programming'], 'Should have programming tag');
    assert.ok(tags['react'], 'Should have react tag');
    assert.ok(tags['frontend'], 'Should have frontend tag');
  });

  test('rejects HTML-enabled exports', async () => {
    const file = loadFixture('anki-html-enabled.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, false, 'Parse should fail');
    assert.ok(result.errors.length > 0, 'Should have errors');
    
    const htmlError = result.errors.find(e => e.includes('HTML'));
    assert.ok(htmlError, 'Should have HTML rejection error');
    assert.ok(htmlError.includes('UNCHECK'), 'Error should include export instructions');
  });

  test('handles multi-line content', async () => {
    const file = loadFixture('anki-multiline.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Parse should succeed');
    
    const cards = Object.values(result.backupData.data.cards);
    assert.strictEqual(cards.length, 2, 'Should have 2 cards');
    
    // Multi-line content should be preserved
    const q1 = cards[0];
    assert.ok(q1.back.includes('closure'), 'Should preserve multi-line back content');
  });

  test('removes UTF-8 BOM marker', async () => {
    const file = loadFixture('anki-utf8-bom.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Parse should succeed');
    
    const cards = Object.values(result.backupData.data.cards);
    assert.ok(cards.length > 0, 'Should parse cards after BOM removal');
  });

  test('handles special characters and unicode', async () => {
    const file = loadFixture('anki-special-chars.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Parse should succeed');
    
    const cards = Object.values(result.backupData.data.cards);
    assert.strictEqual(cards.length, 3, 'Should have 3 cards');
    
    // Check unicode preservation
    const lambdaQ = cards.find(q => q.front.includes('λ'));
    assert.ok(lambdaQ, 'Should find lambda card');
    
    const emojiQ = cards.find(q => q.front.includes('😀'));
    assert.ok(emojiQ, 'Should find emoji card');
    
    const chineseQ = cards.find(q => q.front.includes('你好'));
    assert.ok(chineseQ, 'Should find Chinese card');
  });

  test('handles malformed rows gracefully', async () => {
    const file = loadFixture('anki-malformed.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Parse should succeed with warnings');
    
    const cards = Object.values(result.backupData.data.cards);
    // Should import valid rows (including ones with empty backs)
    // From fixture: "Valid card", "Missing answer" (valid with empty back), "Another valid"
    // Skipped: "\tEmpty front field"
    assert.strictEqual(cards.length, 3, 'Should import 3 valid cards');
    
    // Should have warning for empty front field
    if (result.warnings.length > 0) {
      const emptyFrontWarning = result.warnings.find(w => w.includes('Front field is empty'));
      assert.ok(emptyFrontWarning, 'Should warn about empty front field');
    }
  });

  test('handles empty file', async () => {
    const file = loadFixture('anki-empty.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, false, 'Parse should fail for empty data');
    assert.ok(result.errors.length > 0, 'Should have error');
    
    const noDataError = result.errors.find(e => 
      e.includes('No valid data') || e.includes('empty')
    );
    assert.ok(noDataError, 'Should have appropriate error message');
  });

  test('generates preview cards', async () => {
    const file = loadFixture('anki-basic-3col.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Parse should succeed');
    assert.ok(result.previewCards, 'Should have preview cards');
    assert.ok(result.previewCards.length > 0, 'Preview should have cards');
    assert.ok(result.previewCards.length <= 3, 'Preview should be limited to 3 cards');
    
    const preview = result.previewCards[0];
    assert.ok(preview.front, 'Preview should have front');
    assert.ok(preview.back, 'Preview should have back');
    assert.ok(Array.isArray(preview.tags), 'Preview should have tags array');
  });

  test('initializes algorithm with default spaced repetition', async () => {
    const file = loadFixture('anki-basic-2col.txt');
    const result = await AnkiImporter.parse(file);
    
    const cards = Object.values(result.backupData.data.cards);
    const q1 = cards[0];
    
    assert.ok(q1.algorithm, 'Should have algorithm');
    assert.strictEqual(q1.algorithm.interval, DEFAULT_SPACED_REPETITION.interval);
    assert.strictEqual(q1.algorithm.ease, DEFAULT_SPACED_REPETITION.ease);
    assert.strictEqual(q1.algorithm.repetitions, DEFAULT_SPACED_REPETITION.repetitions);
    assert.ok(q1.algorithm.dueDate, 'Should have dueDate');
  });

  test('generates unique IDs for each card', async () => {
    const file = loadFixture('anki-basic-2col.txt');
    const result = await AnkiImporter.parse(file);
    
    const cards = Object.values(result.backupData.data.cards);
    const ids = cards.map(q => q.id);
    const uniqueIds = new Set(ids);
    
    assert.strictEqual(ids.length, uniqueIds.size, 'All IDs should be unique');
    
    // Check ID format
    ids.forEach(id => {
      assert.ok(id.startsWith('anki_'), 'IDs should start with anki_ prefix');
    });
  });

  test('creates BackupData with correct structure', async () => {
    const file = loadFixture('anki-basic-3col.txt');
    const result = await AnkiImporter.parse(file);
    
    const backupData = result.backupData;
    assert.ok(backupData, 'Should have backupData');
    assert.ok(backupData.version, 'Should have version');
    assert.ok(backupData.timestamp, 'Should have timestamp');
    assert.strictEqual(backupData.scope, 'cards', 'Scope should be cards');
    assert.ok(backupData.data, 'Should have data');
    assert.ok(backupData.data.cards, 'Should have cards in data');
    assert.ok(backupData.data.tags, 'Should have tags in data');
  });

  test('handles file without metadata headers', async () => {
    const file = loadFixture('anki-no-metadata.txt');
    const result = await AnkiImporter.parse(file);
    
    // Should use default separator (tab) and parse successfully
    assert.strictEqual(result.success, true, 'Should parse with default metadata');
    
    const cards = Object.values(result.backupData.data.cards);
    assert.strictEqual(cards.length, 2, 'Should parse both cards');
  });

  test('sets card type to "basic"', async () => {
    const file = loadFixture('anki-basic-2col.txt');
    const result = await AnkiImporter.parse(file);
    
    const cards = Object.values(result.backupData.data.cards);
    cards.forEach(q => {
      assert.strictEqual(q.type, 'basic', 'All cards should be type "basic"');
    });
  });

  test('sets isDraft to false', async () => {
    const file = loadFixture('anki-basic-2col.txt');
    const result = await AnkiImporter.parse(file);
    
    const cards = Object.values(result.backupData.data.cards);
    cards.forEach(q => {
      assert.strictEqual(q.isDraft, false, 'All cards should not be drafts');
    });
  });

  test('generates consistent colors for tags', async () => {
    const file = loadFixture('anki-basic-3col.txt');
    const result = await AnkiImporter.parse(file);
    
    const tags = result.backupData.data.tags;
    Object.values(tags).forEach(tag => {
      assert.ok(tag.color, 'Tag should have color');
      assert.ok(tag.color.startsWith('hsl('), 'Color should be in HSL format');
    });
  });

  test('adds additional tags to all cards', async () => {
    const file = loadFixture('anki-basic-2col.txt');
    const additionalTags = ['imported', 'anki'];
    const result = await AnkiImporter.parse(file, additionalTags);
    
    assert.strictEqual(result.success, true, 'Parse should succeed');
    
    const cards = Object.values(result.backupData.data.cards);
    cards.forEach(q => {
      assert.ok(q.tags.includes('imported'), 'Should include "imported" tag');
      assert.ok(q.tags.includes('anki'), 'Should include "anki" tag');
    });
    
    // Check tags dictionary includes additional tags
    const tags = result.backupData.data.tags;
    assert.ok(tags['imported'], 'Should have "imported" tag in dictionary');
    assert.ok(tags['anki'], 'Should have "anki" tag in dictionary');
  });

  test('combines file tags with additional tags without duplicates', async () => {
    const file = loadFixture('anki-basic-3col.txt');
    const additionalTags = ['programming', 'imported']; // 'programming' already in file
    const result = await AnkiImporter.parse(file, additionalTags);
    
    assert.strictEqual(result.success, true, 'Parse should succeed');
    
    const cards = Object.values(result.backupData.data.cards);
    const firstQ = cards[0]; // Should have 'programming', 'react', 'frontend' from file
    
    // Should have both file tags and additional tags
    assert.ok(firstQ.tags.includes('programming'), 'Should include programming tag');
    assert.ok(firstQ.tags.includes('imported'), 'Should include imported tag');
    
    // Check no duplicates
    const programmingCount = firstQ.tags.filter(t => t === 'programming').length;
    assert.strictEqual(programmingCount, 1, 'Should not have duplicate "programming" tag');
  });
});

describe('AnkiImporter - Integration Tests', () => {
  
  test('full import flow produces valid BackupData', async () => {
    const file = loadFixture('anki-basic-3col.txt');
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true);
    
    const backupData = result.backupData;
    
    // Validate structure
    assert.ok(backupData.version);
    assert.ok(backupData.timestamp);
    assert.strictEqual(backupData.scope, 'cards');
    
    // Validate cards
    const cards = Object.values(backupData.data.cards);
    cards.forEach(card => {
      assert.ok(card.id, 'Card should have ID');
      assert.ok(card.front, 'Card should have front');
      assert.ok(card.back, 'Card should have back');
      assert.ok(card.type, 'Card should have type');
      assert.ok(Array.isArray(card.tags), 'Card should have tags array');
      assert.ok(card.created, 'Card should have created timestamp');
      assert.ok(card.modified, 'Card should have modified timestamp');
      assert.ok(card.algorithm, 'Card should have algorithm');
      assert.strictEqual(typeof card.isDraft, 'boolean', 'Card should have isDraft boolean');
    });
    
    // Validate tags
    const tags = Object.values(backupData.data.tags);
    tags.forEach(tag => {
      assert.ok(tag.id, 'Tag should have ID');
      assert.ok(tag.name, 'Tag should have name');
      assert.ok(tag.color, 'Tag should have color');
      assert.strictEqual(typeof tag.created, 'number', 'Tag should have created timestamp');
    });
  });

  test('handles large import (100+ cards)', async () => {
    // Create a large file in memory
    let content = '#separator:tab\n#html:false\n#tags column:3\n\n';
    for (let i = 0; i < 150; i++) {
      content += `Card ${i}\tAnswer ${i}\ttag${i % 10}\n`;
    }
    
    const blob = new Blob([content]);
    const file = new File([blob], 'large-deck.txt', { type: 'text/plain' });
    
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Should handle large imports');
    
    const cards = Object.values(result.backupData.data.cards);
    assert.ok(cards.length >= 100, 'Should import at least 100 cards');
    assert.ok(cards.length <= 150, 'Should respect max limit');
  });

  test('preview shows exactly 3 cards or fewer', async () => {
    // Test with 2 cards
    let content = '#separator:tab\n#html:false\n\nQ1\tA1\nQ2\tA2\n';
    let blob = new Blob([content]);
    let file = new File([blob], 'two-cards.txt', { type: 'text/plain' });
    let result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.previewCards.length, 2, 'Preview should show 2 cards');
    
    // Test with 5 cards
    content = '#separator:tab\n#html:false\n\nQ1\tA1\nQ2\tA2\nQ3\tA3\nQ4\tA4\nQ5\tA5\n';
    blob = new Blob([content]);
    file = new File([blob], 'five-cards.txt', { type: 'text/plain' });
    result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.previewCards.length, 3, 'Preview should show max 3 cards');
  });
});

describe('AnkiImporter - Edge Cases', () => {
  
  test('handles cards with empty backs', async () => {
    const content = '#separator:tab\n#html:false\n\nCard with empty back\t\n';
    const blob = new Blob([content]);
    const file = new File([blob], 'empty-back.txt', { type: 'text/plain' });
    
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Should accept empty backs');
    const cards = Object.values(result.backupData.data.cards);
    assert.strictEqual(cards.length, 1);
    assert.strictEqual(cards[0].back, '', 'Back should be empty string');
  });

  test('trims whitespace from fields', async () => {
    const content = '#separator:tab\n#html:false\n\n  Card with spaces  \t  Answer with spaces  \n';
    const blob = new Blob([content]);
    const file = new File([blob], 'spaces.txt', { type: 'text/plain' });
    
    const result = await AnkiImporter.parse(file);
    
    const cards = Object.values(result.backupData.data.cards);
    assert.strictEqual(cards[0].front, 'Card with spaces', 'Should trim front');
    assert.strictEqual(cards[0].back, 'Answer with spaces', 'Should trim back');
  });

  test('handles various tag separators', async () => {
    const content = '#separator:tab\n#html:false\n#tags column:3\n\nQ1\tA1\ttag1,tag2;tag3 tag4\n';
    const blob = new Blob([content]);
    const file = new File([blob], 'tag-seps.txt', { type: 'text/plain' });
    
    const result = await AnkiImporter.parse(file);
    
    const cards = Object.values(result.backupData.data.cards);
    const tags = cards[0].tags;
    
    assert.ok(tags.includes('tag1'), 'Should parse comma-separated');
    assert.ok(tags.includes('tag2'), 'Should parse comma-separated');
    assert.ok(tags.includes('tag3'), 'Should parse semicolon-separated');
    assert.ok(tags.includes('tag4'), 'Should parse space-separated');
  });

  test('filters out empty tags', async () => {
    const content = '#separator:tab\n#html:false\n#tags column:3\n\nQ1\tA1\ttag1,  ,tag2,  \n';
    const blob = new Blob([content]);
    const file = new File([blob], 'empty-tags.txt', { type: 'text/plain' });
    
    const result = await AnkiImporter.parse(file);
    
    const cards = Object.values(result.backupData.data.cards);
    const tags = cards[0].tags;
    
    assert.strictEqual(tags.length, 2, 'Should filter empty tags');
    assert.ok(tags.includes('tag1'));
    assert.ok(tags.includes('tag2'));
  });

  test('handles very long content fields', async () => {
    const longFront = 'Q'.repeat(5000);
    const longBack = 'A'.repeat(5000);
    const content = `#separator:tab\n#html:false\n\n${longFront}\t${longBack}\n`;
    const blob = new Blob([content]);
    const file = new File([blob], 'long-content.txt', { type: 'text/plain' });
    
    const result = await AnkiImporter.parse(file);
    
    assert.strictEqual(result.success, true, 'Should handle long content');
    const cards = Object.values(result.backupData.data.cards);
    assert.strictEqual(cards[0].front.length, 5000);
    assert.strictEqual(cards[0].back.length, 5000);
  });
});

console.log('✅ All Anki import tests defined');

