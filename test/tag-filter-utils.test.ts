/**
 * TagFilter Utilities Tests - REAL IMPLEMENTATION
 * Tests the ACTUAL tag filtering utilities used by the TagFilter component
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Import the ACTUAL utilities from the real implementation
import { 
  filterTagsBySearch, 
  toggleTagSelection, 
  removeTagFromSelection, 
  clearAllTags,
  createTagFilterPersistence 
} from '../src/utils/tagFilterUtils';

// Mock localStorage for testing
(global as any).localStorage = {
  data: {} as Record<string, string>,
  getItem(key: string): string | null {
    return this.data[key] || null;
  },
  setItem(key: string, value: string): void {
    this.data[key] = value;
  },
  removeItem(key: string): void {
    delete this.data[key];
  },
  clear(): void {
    this.data = {};
  }
};

describe('TagFilter Utilities (REAL Implementation)', () => {
  
  describe('Persistence Utilities', () => {
    test('should save and load tag filter state', () => {
      (global as any).localStorage.clear();
      const persistence = createTagFilterPersistence();
      
      const testTags = ['JavaScript', 'React', 'TypeScript'];
      persistence.save(testTags);
      
      const loaded = persistence.load();
      assert.deepStrictEqual(loaded, testTags);
    });

    test('should handle empty localStorage', () => {
      (global as any).localStorage.clear();
      const persistence = createTagFilterPersistence();
      
      const loaded = persistence.load();
      assert.deepStrictEqual(loaded, []);
    });

    test('should handle invalid JSON in localStorage', () => {
      (global as any).localStorage.clear();
      (global as any).localStorage.setItem('statistics-tag-filter', 'invalid-json');
      
      const persistence = createTagFilterPersistence();
      const loaded = persistence.load();
      assert.deepStrictEqual(loaded, []);
    });

    test('should handle non-array data in localStorage', () => {
      (global as any).localStorage.clear();
      (global as any).localStorage.setItem('statistics-tag-filter', JSON.stringify({ not: 'array' }));
      
      const persistence = createTagFilterPersistence();
      const loaded = persistence.load();
      assert.deepStrictEqual(loaded, []);
    });

    test('should support custom storage key', () => {
      (global as any).localStorage.clear();
      const persistence = createTagFilterPersistence('custom-key');
      
      const testTags = ['Custom', 'Tags'];
      persistence.save(testTags);
      
      // Check it was saved with custom key
      const stored = (global as any).localStorage.getItem('custom-key');
      assert.strictEqual(stored, JSON.stringify(testTags));
      
      const loaded = persistence.load();
      assert.deepStrictEqual(loaded, testTags);
    });
  });

  // Note: Tag Loading Utilities require complex StorageAPI mocking
  // These are tested indirectly through the TagFilter component integration tests

  describe('Tag Filtering Utilities', () => {
    test('should filter tags by search term case-insensitively', () => {
      const availableTags = ['JavaScript', 'React', 'Node.js', 'TypeScript', 'Python'];
      
      const jsResults = filterTagsBySearch(availableTags, 'java');
      assert.deepStrictEqual(jsResults, ['JavaScript']);
      
      const scriptResults = filterTagsBySearch(availableTags, 'SCRIPT');
      assert.deepStrictEqual(scriptResults, ['JavaScript', 'TypeScript']);
      
      const emptyResults = filterTagsBySearch(availableTags, 'xyz');
      assert.deepStrictEqual(emptyResults, []);
    });

    test('should return all tags when search term is empty', () => {
      const availableTags = ['JavaScript', 'React', 'Node.js'];
      
      const results = filterTagsBySearch(availableTags, '');
      assert.deepStrictEqual(results, availableTags);
    });

    test('should handle special characters in search', () => {
      const availableTags = ['Node.js', 'C++', 'C#', 'F#'];
      
      const nodeResults = filterTagsBySearch(availableTags, 'node.');
      assert.deepStrictEqual(nodeResults, ['Node.js']);
      
      const cResults = filterTagsBySearch(availableTags, 'c');
      assert.deepStrictEqual(cResults, ['C++', 'C#']);
    });
  });

  describe('Tag Selection Utilities', () => {
    test('should add tag when not selected (toggleTagSelection)', () => {
      const selectedTags = ['JavaScript'];
      const result = toggleTagSelection(selectedTags, 'React');
      
      assert.deepStrictEqual(result, ['JavaScript', 'React']);
      // Original array should be unchanged
      assert.deepStrictEqual(selectedTags, ['JavaScript']);
    });

    test('should remove tag when already selected (toggleTagSelection)', () => {
      const selectedTags = ['JavaScript', 'React', 'Node.js'];
      const result = toggleTagSelection(selectedTags, 'React');
      
      assert.deepStrictEqual(result, ['JavaScript', 'Node.js']);
      assert(!result.includes('React'));
    });

    test('should remove specific tag (removeTagFromSelection)', () => {
      const selectedTags = ['JavaScript', 'React', 'Node.js'];
      const result = removeTagFromSelection(selectedTags, 'React');
      
      assert.deepStrictEqual(result, ['JavaScript', 'Node.js']);
      assert(!result.includes('React'));
    });

    test('should handle removing non-existent tag', () => {
      const selectedTags = ['JavaScript'];
      const result = removeTagFromSelection(selectedTags, 'NonExistent');
      
      assert.deepStrictEqual(result, ['JavaScript']);
    });

    test('should clear all tags', () => {
      const result = clearAllTags();
      assert.deepStrictEqual(result, []);
    });

    test('should handle empty selection for all operations', () => {
      const emptySelection: string[] = [];
      
      const toggleResult = toggleTagSelection(emptySelection, 'JavaScript');
      assert.deepStrictEqual(toggleResult, ['JavaScript']);
      
      const removeResult = removeTagFromSelection(emptySelection, 'JavaScript');
      assert.deepStrictEqual(removeResult, []);
      
      const clearResult = clearAllTags();
      assert.deepStrictEqual(clearResult, []);
    });
  });

  describe('Integration Scenarios (Real Usage Patterns)', () => {
    test('should handle tag filter workflow with mock data', () => {
      (global as any).localStorage.clear();
      const persistence = createTagFilterPersistence();
      
      // Mock available tags (as if loaded from storage)
      const availableTags = ['JavaScript', 'TypeScript', 'React', 'Node.js'];
      
      // Filter tags by search
      const filteredTags = filterTagsBySearch(availableTags, 'script');
      assert(filteredTags.includes('JavaScript'));
      assert(filteredTags.includes('TypeScript'));
      
      // Select tags
      let selectedTags: string[] = [];
      selectedTags = toggleTagSelection(selectedTags, 'JavaScript');
      selectedTags = toggleTagSelection(selectedTags, 'TypeScript');
      assert.deepStrictEqual(selectedTags, ['JavaScript', 'TypeScript']);
      
      // Persist selection
      persistence.save(selectedTags);
      
      // Verify persistence
      const loaded = persistence.load();
      assert.deepStrictEqual(loaded, selectedTags);
      
      // Remove a tag
      selectedTags = removeTagFromSelection(selectedTags, 'TypeScript');
      assert.deepStrictEqual(selectedTags, ['JavaScript']);
      
      // Clear all
      selectedTags = clearAllTags();
      assert.deepStrictEqual(selectedTags, []);
    });
  });
});
