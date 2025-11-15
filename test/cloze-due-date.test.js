/**
 * Cloze Due Date Calculation Tests (REAL Implementation)
 * 
 * Tests the actual due date calculation logic for cloze cards
 * from src/utils/dateUtils.ts and validates consistency with 
 * background script behavior.
 * 
 * Testing Strategy:
 * - Uses REAL getClozeCardDueDate function from production code
 * - Tests actual behavior of formatDueBadge with cloze cards
 * - Validates consistency between UI and background script calculations
 * - Covers edge cases: missing deletions, invalid algorithm data
 * 
 * Key Implementation Details Verified:
 * - Returns earliest due date among all deletions for cloze cards
 * - Falls back to main algorithm.dueDate for non-cloze cards
 * - Handles missing or invalid deletion algorithm data gracefully
 * - Consistent with background script getEarliestDueDate logic
 */

const test = require('node:test');
const assert = require('node:assert');

// Import the ACTUAL implementation
const tsnode = require('ts-node');
tsnode.register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { getEffectiveDueDate, formatDueBadge } = require('../src/utils/dateUtils.ts');

// Test helper to create cards
const createTestCard = (type, algorithm, clozeDeletions = null) => ({
  id: 'test-card',
  type,
  front: 'Test card front',
  back: 'Test answer',
  tags: ['test'],
  created: Date.now(),
  modified: Date.now(),
  isDraft: false,
  algorithm,
  clozeDeletions
});

test('Cloze Due Date Calculations (REAL Implementation)', async (t) => {
  
  await t.test('Non-cloze cards', async (t) => {
    await t.test('should return main algorithm due date for basic cards', () => {
      const dueDate = Date.now() + 24 * 60 * 60 * 1000; // 1 day from now
      const card = createTestCard('basic', { dueDate, interval: 1, ease: 2.5, repetitions: 0 });
      
      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, dueDate, 'Should return main algorithm due date for basic cards');
    });

    await t.test('should return main algorithm due date for text cards', () => {
      const dueDate = Date.now() - 60 * 60 * 1000; // 1 hour overdue
      const card = createTestCard('text', { dueDate, interval: 5, ease: 2.2, repetitions: 3 });
      
      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, dueDate, 'Should return main algorithm due date for text cards');
    });

    await t.test('should return main algorithm due date for single choice cards', () => {
      const dueDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 1 week from now
      const card = createTestCard('single', { dueDate, interval: 10, ease: 2.8, repetitions: 5 });
      
      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, dueDate, 'Should return main algorithm due date for single choice cards');
    });
  });

  await t.test('Cloze cards with valid deletions', async (t) => {
    await t.test('should return earliest due date among deletions', () => {
      const now = Date.now();
      const earliestDue = now - 2 * 60 * 60 * 1000; // 2 hours ago (most overdue)
      const laterDue = now + 60 * 60 * 1000; // 1 hour from now
      const latestDue = now + 24 * 60 * 60 * 1000; // 1 day from now

      const card = createTestCard('cloze', 
        { dueDate: now, interval: 1, ease: 2.5, repetitions: 0 },
        [
          {
            id: 1,
            text: 'Paris',
            hint: 'capital',
            algorithm: { dueDate: laterDue, interval: 3, ease: 2.4, repetitions: 2 }
          },
          {
            id: 2,
            text: 'France',
            algorithm: { dueDate: earliestDue, interval: 1, ease: 2.3, repetitions: 1 }
          },
          {
            id: 3,
            text: 'Europe',
            algorithm: { dueDate: latestDue, interval: 7, ease: 2.7, repetitions: 4 }
          }
        ]
      );

      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, earliestDue, 'Should return the earliest due date among all deletions');
    });

    await t.test('should work with single deletion', () => {
      const dueDate = Date.now() - 30 * 60 * 1000; // 30 minutes overdue
      
      const card = createTestCard('cloze',
        { dueDate: Date.now(), interval: 1, ease: 2.5, repetitions: 0 },
        [
          {
            id: 1,
            text: 'answer',
            algorithm: { dueDate, interval: 2, ease: 2.1, repetitions: 1 }
          }
        ]
      );

      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, dueDate, 'Should return the single deletion due date');
    });

    await t.test('should handle deletions with hints correctly', () => {
      const earliestDue = Date.now() - 45 * 60 * 1000; // 45 minutes overdue
      const laterDue = Date.now() + 2 * 60 * 60 * 1000; // 2 hours from now

      const card = createTestCard('cloze',
        { dueDate: Date.now(), interval: 1, ease: 2.5, repetitions: 0 },
        [
          {
            id: 1,
            text: 'Berlin',
            hint: 'German capital',
            algorithm: { dueDate: laterDue, interval: 5, ease: 2.6, repetitions: 3 }
          },
          {
            id: 2,
            text: 'Germany',
            hint: 'European country',
            algorithm: { dueDate: earliestDue, interval: 2, ease: 2.2, repetitions: 1 }
          }
        ]
      );

      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, earliestDue, 'Should handle deletions with hints and return earliest due date');
    });
  });

  await t.test('Cloze cards with edge cases', async (t) => {
    await t.test('should fallback to main algorithm when no deletions exist', () => {
      const mainDueDate = Date.now() + 12 * 60 * 60 * 1000; // 12 hours from now
      
      const card = createTestCard('cloze',
        { dueDate: mainDueDate, interval: 3, ease: 2.4, repetitions: 2 },
        [] // No deletions
      );

      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, mainDueDate, 'Should fallback to main algorithm due date when no deletions exist');
    });

    await t.test('should fallback to main algorithm when clozeDeletions is null', () => {
      const mainDueDate = Date.now() - 6 * 60 * 60 * 1000; // 6 hours overdue
      
      const card = createTestCard('cloze',
        { dueDate: mainDueDate, interval: 1, ease: 2.5, repetitions: 0 },
        null // null deletions
      );

      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, mainDueDate, 'Should fallback to main algorithm due date when clozeDeletions is null');
    });

    await t.test('should filter out deletions with invalid algorithm data', () => {
      const validDueDate = Date.now() - 90 * 60 * 1000; // 90 minutes overdue
      const mainDueDate = Date.now() + 24 * 60 * 60 * 1000; // 1 day from now

      const card = createTestCard('cloze',
        { dueDate: mainDueDate, interval: 5, ease: 2.6, repetitions: 3 },
        [
          {
            id: 1,
            text: 'invalid1',
            algorithm: null // Invalid algorithm
          },
          {
            id: 2,
            text: 'invalid2',
            algorithm: { dueDate: 'invalid', interval: 2, ease: 2.2, repetitions: 1 } // Invalid due date
          },
          {
            id: 3,
            text: 'valid',
            algorithm: { dueDate: validDueDate, interval: 3, ease: 2.3, repetitions: 2 } // Valid
          },
          {
            id: 4,
            text: 'invalid3'
            // Missing algorithm entirely
          }
        ]
      );

      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, validDueDate, 'Should filter out invalid algorithm data and return earliest valid due date');
    });

    await t.test('should fallback when all deletions have invalid algorithm data', () => {
      const mainDueDate = Date.now() - 3 * 60 * 60 * 1000; // 3 hours overdue

      const card = createTestCard('cloze',
        { dueDate: mainDueDate, interval: 2, ease: 2.1, repetitions: 1 },
        [
          {
            id: 1,
            text: 'invalid1',
            algorithm: null
          },
          {
            id: 2,
            text: 'invalid2',
            algorithm: { dueDate: NaN, interval: 2, ease: 2.2, repetitions: 1 }
          },
          {
            id: 3,
            text: 'invalid3'
            // Missing algorithm
          }
        ]
      );

      const result = getEffectiveDueDate(card);
      assert.strictEqual(result, mainDueDate, 'Should fallback to main algorithm when all deletions have invalid data');
    });
  });

  await t.test('Integration with formatDueBadge', async (t) => {
    await t.test('should work correctly with formatDueBadge for overdue cloze cards', () => {
      const now = Date.now();
      const overdueDate = now - 2 * 60 * 60 * 1000; // 2 hours overdue
      const futureDate = now + 24 * 60 * 60 * 1000; // 1 day from now

      const card = createTestCard('cloze',
        { dueDate: futureDate, interval: 5, ease: 2.5, repetitions: 3 },
        [
          {
            id: 1,
            text: 'overdue deletion',
            algorithm: { dueDate: overdueDate, interval: 1, ease: 2.3, repetitions: 0 }
          }
        ]
      );

      const effectiveDueDate = getEffectiveDueDate(card);
      const badge = formatDueBadge(effectiveDueDate, now);
      
      assert.strictEqual(effectiveDueDate, overdueDate, 'Should use deletion due date, not main algorithm');
      assert.strictEqual(badge.urgent, true, 'Should mark as urgent since deletion is overdue');
      assert.ok(badge.text.includes('overdue') || badge.text === 'Due now', 'Should show overdue text');
    });

    await t.test('should work correctly with formatDueBadge for future cloze cards', () => {
      const now = Date.now();
      const tomorrow = now + 25 * 60 * 60 * 1000; // 25 hours from now (definitely tomorrow)
      const laterFuture = now + 48 * 60 * 60 * 1000; // 2 days from now

      const card = createTestCard('cloze',
        { dueDate: laterFuture, interval: 10, ease: 2.8, repetitions: 5 },
        [
          {
            id: 1,
            text: 'future deletion',
            algorithm: { dueDate: tomorrow, interval: 3, ease: 2.4, repetitions: 2 }
          }
        ]
      );

      const effectiveDueDate = getEffectiveDueDate(card);
      const badge = formatDueBadge(effectiveDueDate, now);
      
      assert.strictEqual(effectiveDueDate, tomorrow, 'Should use earliest deletion due date');
      assert.strictEqual(badge.urgent, false, 'Should not be urgent since deletion is tomorrow');
    });
  });

  await t.test('Consistency with background script logic', async (t) => {
    await t.test('should match getEarliestDueDate logic from background script', () => {
      // This test replicates the logic from background.ts lines 1356-1365
      const now = Date.now();
      const mockCard = createTestCard('cloze',
        { dueDate: now + 24 * 60 * 60 * 1000, interval: 5, ease: 2.5, repetitions: 3 },
        [
          {
            id: 1,
            text: 'first',
            algorithm: { dueDate: now - 60 * 60 * 1000, interval: 2, ease: 2.2, repetitions: 1 } // 1 hour ago
          },
          {
            id: 2,
            text: 'second', 
            algorithm: { dueDate: now - 30 * 60 * 1000, interval: 1, ease: 2.1, repetitions: 0 } // 30 minutes ago
          }
        ]
      );

      // Background script logic (simulated)
      const dueDeletions = mockCard.clozeDeletions.filter(d => d.algorithm.dueDate <= now);
      const backgroundResult = dueDeletions.length > 0 ? Math.min(...dueDeletions.map(d => d.algorithm.dueDate)) : mockCard.algorithm.dueDate;
      
      // Our utility function result
      const utilityResult = getEffectiveDueDate(mockCard);
      
      assert.strictEqual(utilityResult, backgroundResult, 'Should match background script getEarliestDueDate logic exactly');
      assert.strictEqual(utilityResult, now - 60 * 60 * 1000, 'Should return the earliest overdue deletion (1 hour ago)');
    });

    await t.test('should handle non-cloze cards same as background script', () => {
      const dueDate = Date.now() - 2 * 60 * 60 * 1000; // 2 hours overdue
      const card = createTestCard('text', { dueDate, interval: 3, ease: 2.3, repetitions: 2 });
      
      // Background script would return card.algorithm.dueDate for non-cloze
      const backgroundResult = card.algorithm.dueDate;
      const utilityResult = getEffectiveDueDate(card);
      
      assert.strictEqual(utilityResult, backgroundResult, 'Should match background script behavior for non-cloze cards');
      assert.strictEqual(utilityResult, dueDate, 'Should return main algorithm due date for non-cloze cards');
    });
  });
});
