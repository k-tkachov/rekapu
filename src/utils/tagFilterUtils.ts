/**
 * Tag filtering utilities extracted from TagFilter component for testing
 */

import { StorageAPI } from '../storage/StorageAPI';

export interface TagFilterPersistence {
  save: (tagNames: string[]) => void;
  load: () => string[];
}

/**
 * Create persistence interface for tag filter state
 */
export const createTagFilterPersistence = (storageKey: string = 'statistics-tag-filter'): TagFilterPersistence => {
  return {
    save: (tagNames: string[]) => {
      localStorage.setItem(storageKey, JSON.stringify(tagNames));
    },
    
    load: () => {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (error) {
          console.warn('Failed to parse saved tag filter from localStorage:', error);
        }
      }
      return [];
    }
  };
};

/**
 * Load available tags from tags table (source of truth)
 */
export const loadAvailableTags = async (): Promise<string[]> => {
  // Get tags from tags table only (source of truth)
  const tagsResult = await StorageAPI.getAllTags();

  if (tagsResult.success && tagsResult.data) {
    const tags = Object.values(tagsResult.data);
    
    // Sort by creation date (most recent first), then alphabetically
    return tags
      .sort((a, b) => {
        // First by creation date (newest first)
        if (b.created !== a.created) {
          return b.created - a.created;
        }
        // Then alphabetically
        return a.name.localeCompare(b.name);
      })
      .map(tag => tag.name);
  }

  return [];
};

/**
 * Filter tags by search term (actual TagFilter logic)
 */
export const filterTagsBySearch = (availableTags: string[], searchTerm: string): string[] => {
  return availableTags.filter(tagName =>
    tagName.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

/**
 * Toggle tag selection (actual TagFilter logic)
 */
export const toggleTagSelection = (selectedTags: string[], tagName: string): string[] => {
  if (selectedTags.includes(tagName)) {
    return selectedTags.filter(name => name !== tagName);
  } else {
    return [...selectedTags, tagName];
  }
};

/**
 * Remove tag from selection (actual TagFilter logic) 
 */
export const removeTagFromSelection = (selectedTags: string[], tagName: string): string[] => {
  return selectedTags.filter(name => name !== tagName);
};

/**
 * Clear all selected tags (actual TagFilter logic)
 */
export const clearAllTags = (): string[] => {
  return [];
};
