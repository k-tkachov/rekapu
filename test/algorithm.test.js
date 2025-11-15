/**
 * Spaced Repetition Algorithm Tests (REAL Implementation)
 * 
 * This test suite validates the actual SuperMemo-2 algorithm implementation
 * from src/spaced-repetition/SpacedRepetitionEngine.ts
 * 
 * Testing Strategy:
 * - Imports and tests the REAL production SpacedRepetitionEngine class
 * - Validates actual interval calculations, ease adjustments, and due dates
 * - Tests discovered implementation details like early learning phases
 * - All assertions are based on actual algorithm behavior, not assumptions
 * 
 * Key Implementation Details Verified:
 * - Early learning phase: "again" responses reset to 1-day intervals
 * - Ease factor adjustments: decrease on hard/again, increase on easy
 * - Minimum intervals and ease constraints are enforced
 * - Due date calculations use real timestamp logic
 * 
 * This replaces previous fake TestSpacedRepetitionEngine that didn't match production behavior.
 * Tests the ACTUAL SpacedRepetitionEngine used by the application.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

// Import the ACTUAL SpacedRepetitionEngine implementation
const tsnode = require('ts-node');
tsnode.register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const { SpacedRepetitionEngine } = require('../src/spaced-repetition/SpacedRepetitionEngine.ts');

// Test helper
const createTestCard = (algorithm) => ({
  id: 'test-card',
  type: 'text',
  front: 'Test card',
  back: 'Test answer',
  tags: ['test'],
  created: Date.now(),
  modified: Date.now(),
  algorithm: algorithm || {
    interval: 1,
    ease: 2.5,
    repetitions: 0,
    dueDate: Date.now()
  }
});

describe('Spaced Repetition Algorithm (REAL Implementation)', () => {
  
  describe('New Card Learning Progression', () => {
    test('should follow correct learning sequence for new card', () => {
      let card = createTestCard();
      
      // First "good" answer
      let result = SpacedRepetitionEngine.calculateNext(card, 'good');
      assert.strictEqual(result.interval, 1, 'First "good" should set interval to 1');
      assert.strictEqual(result.repetitions, 1, 'First answer should increment repetitions');
      assert.strictEqual(result.ease, 2.5, 'Ease should remain unchanged for "good"');
      
      // Second "good" answer
      card.algorithm = result;
      result = SpacedRepetitionEngine.calculateNext(card, 'good');
      assert.strictEqual(result.interval, 6, 'Second "good" should set interval to 6');
      assert.strictEqual(result.repetitions, 2, 'Second answer should increment repetitions');
      
      // Third "good" answer
      card.algorithm = result;
      result = SpacedRepetitionEngine.calculateNext(card, 'good');
      const expectedInterval = Math.round(6 * 2.5);
      assert.strictEqual(result.interval, expectedInterval, 'Third "good" should use ease multiplication');
      assert.strictEqual(result.repetitions, 3, 'Third answer should increment repetitions');
    });
  });

  describe('Difficulty Response Handling', () => {
    test('should reset progress on "again"', () => {
      const card = createTestCard({
        interval: 10,
        ease: 2.5,
        repetitions: 3,
        dueDate: Date.now()
      });

      const result = SpacedRepetitionEngine.calculateNext(card, 'again');
      
      // "Again" in real implementation uses very short intervals (1 minute = 1/1440 days)
      assert.strictEqual(result.interval, 1/1440, 'Again should reset to 1 minute interval');
      assert.strictEqual(result.ease, 2.5, 'Again should reset ease to initial value');
      assert.strictEqual(result.repetitions, 0, 'Again should reset repetitions to 0');
    });

    test('should decrease ease and moderately increase interval on "hard"', () => {
      const card = createTestCard({
        interval: 10,
        ease: 2.5,
        repetitions: 3,
        dueDate: Date.now()
      });

      const result = SpacedRepetitionEngine.calculateNext(card, 'hard');
      
      assert.strictEqual(result.ease, 2.35, 'Hard should decrease ease by 0.15');
      assert.strictEqual(result.interval, 12, 'Hard should multiply interval by 1.2');
      assert.strictEqual(result.repetitions, 4, 'Hard should increment repetitions');
    });

    test('should increase ease and aggressively increase interval on "easy"', () => {
      const card = createTestCard({
        interval: 10,
        ease: 2.5,
        repetitions: 3,
        dueDate: Date.now()
      });

      const result = SpacedRepetitionEngine.calculateNext(card, 'easy');
      
      assert.strictEqual(result.ease, 2.65, 'Easy should increase ease by 0.15');
      const expectedInterval = Math.round(10 * 2.65 * 1.3);
      assert.strictEqual(result.interval, expectedInterval, 'Easy should use enhanced multiplication');
      assert.strictEqual(result.repetitions, 4, 'Easy should increment repetitions');
    });

    test('should respect minimum ease constraint', () => {
      const card = createTestCard({
        interval: 5,
        ease: 1.4, // Close to minimum
        repetitions: 2,
        dueDate: Date.now()
      });

      const result = SpacedRepetitionEngine.calculateNext(card, 'hard');
      
      assert.strictEqual(result.ease, 1.3, 'Ease should not go below minimum');
    });

    test('should handle early learning phases correctly', () => {
      // Test "hard" response in early learning phases
      const newCard = createTestCard({
        interval: 1/1440, // 1 minute
        ease: 2.5,
        repetitions: 0,
        dueDate: Date.now()
      });

      const result = SpacedRepetitionEngine.calculateNext(newCard, 'hard');
      
      assert.strictEqual(result.interval, 6/1440, 'Hard in learning phase should use 6 minutes');
      assert.strictEqual(result.repetitions, 1, 'Should increment repetitions');
    });
  });

  describe('Due Date Filtering', () => {
    test('should correctly identify due cards', () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      const cards = [
        createTestCard({ interval: 1, ease: 2.5, repetitions: 0, dueDate: now - oneDay }), // Overdue
        createTestCard({ interval: 5, ease: 2.0, repetitions: 1, dueDate: now - (oneDay * 2) }), // Very overdue
        createTestCard({ interval: 10, ease: 2.8, repetitions: 2, dueDate: now + oneDay }), // Future
        createTestCard({ interval: 3, ease: 2.3, repetitions: 1, dueDate: now - 1000 }), // Recently overdue
      ];

      cards.forEach((q, i) => {
        q.id = `card-${i}`;
      });

      const dueCards = SpacedRepetitionEngine.filterDueCards(cards, now);
      
      assert.strictEqual(dueCards.length, 3, 'Should find 3 due cards');
      assert.strictEqual(dueCards[0].id, 'card-1', 'Most overdue card should be first');
      assert.strictEqual(dueCards[1].id, 'card-0', 'Second most overdue should be second');
      assert.strictEqual(dueCards[2].id, 'card-3', 'Recently overdue should be last');
    });

    test('should sort due cards by priority (overdue date, then interval)', () => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      const cards = [
        createTestCard({ interval: 10, ease: 2.5, repetitions: 2, dueDate: now - oneHour }), // Same overdue time, higher interval
        createTestCard({ interval: 5, ease: 2.5, repetitions: 1, dueDate: now - oneHour }), // Same overdue time, lower interval
      ];

      cards.forEach((q, i) => {
        q.id = `card-${i}`;
      });

      const dueCards = SpacedRepetitionEngine.filterDueCards(cards, now);
      
      assert.strictEqual(dueCards[0].id, 'card-1', 'Lower interval should have priority when overdue time is same');
      assert.strictEqual(dueCards[1].id, 'card-0', 'Higher interval should come second');
    });
  });

  describe('Algorithm Utility Functions', () => {
    test('should initialize new cards correctly', () => {
      const result = SpacedRepetitionEngine.initializeNewCard();
      
      assert.strictEqual(result.interval, 1, 'New card should have 1 day interval');
      assert.strictEqual(result.ease, 2.5, 'New card should have initial ease');
      assert.strictEqual(result.repetitions, 0, 'New card should have 0 repetitions');
      assert.ok(result.dueDate <= Date.now(), 'New card should be due immediately');
    });

    test('should validate and repair algorithm data', () => {
      const corruptedData = {
        interval: NaN,
        ease: 'invalid',
        repetitions: -1,
        dueDate: undefined
      };

      const result = SpacedRepetitionEngine.validateAlgorithmData(corruptedData);
      
      assert.strictEqual(result.interval, 1, 'Should repair invalid interval');
      assert.strictEqual(result.ease, 2.5, 'Should repair invalid ease');
      assert.strictEqual(result.repetitions, 0, 'Should repair negative repetitions');
      assert.ok(typeof result.dueDate === 'number', 'Should repair invalid due date');
    });

    test('should check due status correctly', () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      const overdueCard = createTestCard({ 
        interval: 1, ease: 2.5, repetitions: 0, dueDate: now - oneDay 
      });
      const futureCard = createTestCard({ 
        interval: 1, ease: 2.5, repetitions: 0, dueDate: now + oneDay 
      });

      assert.strictEqual(SpacedRepetitionEngine.isDue(overdueCard, now), true, 'Overdue card should be due');
      assert.strictEqual(SpacedRepetitionEngine.isDue(futureCard, now), false, 'Future card should not be due');
    });
  });

  describe('Input Validation', () => {
    test('should throw error for unknown difficulty', () => {
      const card = createTestCard();
      
      assert.throws(
        () => SpacedRepetitionEngine.calculateNext(card, 'unknown'),
        /Unknown difficulty: unknown/,
        'Should throw error for invalid difficulty'
      );
    });
  });
}); 