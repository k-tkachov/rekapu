import {
  DomainSettings,
  Card,
  CardResponse,
  GlobalSettings,
  StorageStats,
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_DOMAIN_SETTINGS,
} from '../types/storage';

import { Tag, CardSummary } from '../types/index';
import { SpacedRepetitionEngine } from '../spaced-repetition/SpacedRepetitionEngine';
import { getRandomTagColor } from '../utils/tagColors';
import { getEffectiveDueDate } from '../utils/dateUtils';
import { indexedDBManager } from './IndexedDBManager';
import { performanceMonitor } from './IndexedDBPerformanceMonitor';
import { indexedDBQuotaManager } from './IndexedDBQuotaManager';
import { 
  GlobalSettingsRecord,
  StorageStatsRecord,
  ActiveTagRecord
} from './IndexedDBSchema';

/**
 * Storage operation result with success/error handling
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Storage manager for IndexedDB operations
 * Handles CRUD operations for all data models with proper error handling
 */
export class StorageManager {
  /**
   * Initialize storage with default values if not exists
   */
  static async initialize(): Promise<StorageResult<boolean>> {
    try {
      // Check if global settings exist
      const globalSettingsResult = await indexedDBManager.getGlobalSettings();
      if (!globalSettingsResult.success) {
        return { success: false, error: globalSettingsResult.error };
      }

      // Initialize global settings if not exists
      if (!globalSettingsResult.data) {
        const settingsRecord: GlobalSettingsRecord = {
          key: 'settings',
          data: {
            defaultCooldownPeriod: DEFAULT_GLOBAL_SETTINGS.defaultCooldownPeriod,
            maxCardsPerSession: DEFAULT_GLOBAL_SETTINGS.maxCardsPerSession,
            theme: DEFAULT_GLOBAL_SETTINGS.theme,
            dailyGoal: DEFAULT_GLOBAL_SETTINGS.dailyGoal,
            weekStartsOnMonday: DEFAULT_GLOBAL_SETTINGS.weekStartsOnMonday,
            autoAdvanceDelay: DEFAULT_GLOBAL_SETTINGS.autoAdvanceDelay,
            backupScope: DEFAULT_GLOBAL_SETTINGS.backupScope,
          },
          lastUpdated: Date.now(),
        };
        const initResult = await indexedDBManager.setGlobalSettings(settingsRecord);
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      // Check if stats exist
      const statsResult = await indexedDBManager.getStorageStats();
      if (!statsResult.success) {
        return { success: false, error: statsResult.error };
      }

      // Initialize stats if not exists
      if (!statsResult.data) {
        const initialStats: StorageStatsRecord = {
          key: 'stats',
          data: {
            totalCards: 0,
            totalDomains: 0,
            totalResponses: 0,
            totalTags: 0,
            storageUsed: 0,
            lastCleanup: Date.now(),
          },
          lastUpdated: Date.now(),
        };
        const initStatsResult = await indexedDBManager.updateStorageStats(initialStats);
        if (!initStatsResult.success) {
          return { success: false, error: initStatsResult.error };
        }
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to initialize IndexedDB storage: ${error}`,
      };
    }
  }

  // =================== GLOBAL SETTINGS ===================

  /**
   * Get global settings
   */
  static async getGlobalSettings(): Promise<StorageResult<GlobalSettings>> {
    const result = await indexedDBManager.getGlobalSettings();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Handle backward compatibility - stored data might not have all new fields
    if (result.data) {
      // Type the stored data as potentially missing new fields
      const storedData = result.data.data as Partial<GlobalSettings>;
      const settings: GlobalSettings = {
        defaultCooldownPeriod: storedData.defaultCooldownPeriod ?? DEFAULT_GLOBAL_SETTINGS.defaultCooldownPeriod,
        maxCardsPerSession: storedData.maxCardsPerSession ?? DEFAULT_GLOBAL_SETTINGS.maxCardsPerSession,
        theme: storedData.theme ?? DEFAULT_GLOBAL_SETTINGS.theme,
        dailyGoal: storedData.dailyGoal ?? DEFAULT_GLOBAL_SETTINGS.dailyGoal,
        weekStartsOnMonday: storedData.weekStartsOnMonday ?? DEFAULT_GLOBAL_SETTINGS.weekStartsOnMonday,
        autoAdvanceDelay: storedData.autoAdvanceDelay ?? DEFAULT_GLOBAL_SETTINGS.autoAdvanceDelay,
        backupScope: storedData.backupScope ?? DEFAULT_GLOBAL_SETTINGS.backupScope,
      };
      return { success: true, data: settings };
    }
    
    return { success: true, data: DEFAULT_GLOBAL_SETTINGS };
  }

  /**
   * Update global settings
   */
  static async updateGlobalSettings(
    updates: Partial<GlobalSettings>
  ): Promise<StorageResult<GlobalSettings>> {
    const currentResult = await this.getGlobalSettings();
    if (!currentResult.success) {
      return currentResult;
    }

    const updated = { ...currentResult.data!, ...updates };
    
    const settingsRecord: GlobalSettingsRecord = {
      key: 'settings',
      data: {
        defaultCooldownPeriod: updated.defaultCooldownPeriod,
        maxCardsPerSession: updated.maxCardsPerSession,
        theme: updated.theme,
        dailyGoal: updated.dailyGoal,
        weekStartsOnMonday: updated.weekStartsOnMonday,
        autoAdvanceDelay: updated.autoAdvanceDelay,
        backupScope: updated.backupScope,
      },
      lastUpdated: Date.now(),
    };
    
    const result = await indexedDBManager.setGlobalSettings(settingsRecord);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // If dailyGoal changed, invalidate streak cache to show updated values immediately
    if (updates.dailyGoal !== undefined) {
      const { StatisticsEngine } = await import('./StatisticsEngine');
      StatisticsEngine.invalidateCache(['streak']);
    }

    return { success: true, data: updated };
  }

  // =================== DOMAIN MANAGEMENT ===================

  /**
   * Get count of domains (efficient - no data loading)
   */
  static async getDomainsCount(): Promise<StorageResult<number>> {
    const result = await indexedDBManager.countDomains();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data || 0 };
  }

  /**
   * Get all domains
   */
  static async getAllDomains(): Promise<StorageResult<Record<string, DomainSettings>>> {
    const result = await indexedDBManager.getAllDomains();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const domains: Record<string, DomainSettings> = {};
    result.data?.forEach(domain => {
      domains[domain.domain] = domain;
    });

    return { success: true, data: domains };
  }

  /**
   * Get domain settings
   */
  static async getDomain(domain: string): Promise<StorageResult<DomainSettings | null>> {
    const result = await indexedDBManager.getDomain(domain);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * Set domain settings
   */
  static async setDomain(
    domain: string,
    settings: Partial<DomainSettings>
  ): Promise<StorageResult<DomainSettings>> {
    const now = Date.now();
    const domainSettings: DomainSettings = {
      domain,
      cooldownPeriod: settings.cooldownPeriod ?? DEFAULT_DOMAIN_SETTINGS.cooldownPeriod,
      isActive: settings.isActive ?? DEFAULT_DOMAIN_SETTINGS.isActive,
      lastUnblock: settings.lastUnblock ?? DEFAULT_DOMAIN_SETTINGS.lastUnblock,
      subdomainsIncluded: settings.subdomainsIncluded ?? DEFAULT_DOMAIN_SETTINGS.subdomainsIncluded,
      created: settings.created ?? now,
      modified: now,
    };

    const result = await indexedDBManager.setDomain(domainSettings);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: domainSettings };
  }

  /**
   * Remove domain settings
   */
  static async removeDomain(domain: string): Promise<StorageResult<boolean>> {
    const result = await indexedDBManager.removeDomain(domain);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    await this.updateStats();

    return { success: true, data: true };
  }

  // =================== CARDS ===================

  /**
   * Get count of cards (efficient - no data loading)
   */
  static async getCardsCount(): Promise<StorageResult<number>> {
    const result = await indexedDBManager.countCards();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data || 0 };
  }

  /**
   * Get all card IDs (lightweight operation)
   */
  static async getCardIds(): Promise<StorageResult<string[]>> {
    const result = await indexedDBManager.getAllCards();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const cardIds = result.data?.map(card => card.id) || [];
    return { success: true, data: cardIds };
  }

  /**
   * Get a random card efficiently (without loading all cards)
   */
  static async getRandomCard(): Promise<StorageResult<Card | null>> {
    try {
      // First, get just the card IDs (lightweight)
      const idsResult = await this.getCardIds();
      if (!idsResult.success) {
        return {
          success: false,
          error: idsResult.error,
        };
      }

      const cardIds = idsResult.data!;
      if (cardIds.length === 0) {
        return { success: true, data: null }; // No cards available
      }

      // Pick a random ID
      const randomIndex = Math.floor(Math.random() * cardIds.length);
      const randomId = cardIds[randomIndex];

      // Fetch only that specific card
      return await this.getCard(randomId);
    } catch (error) {
      return {
        success: false,
        error: `Failed to get random card: ${error}`,
      };
    }
  }

  /**
   * Get all cards
   */
  static async getAllCards(): Promise<StorageResult<Record<string, Card>>> {
    const result = await indexedDBManager.getAllCards();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const cards: Record<string, Card> = {};
    result.data?.forEach(card => {
      cards[card.id] = card;
    });

    return { success: true, data: cards };
  }

  /**
   * Get cards with pagination, filtering, and sorting
   */
  static async getCardsPaginated(options: {
    page: number;
    limit: number;
    search?: string;
    tagFilter?: string;
    sortBy?: 'created' | 'modified' | 'due' | 'front';
    sortOrder?: 'asc' | 'desc';
  }): Promise<StorageResult<{
    cards: Card[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }>> {
    try {
      // Get all cards first (we'll optimize this further later with IndexedDB cursors)
      const allCardsResult = await this.getAllCards();
      if (!allCardsResult.success) {
        return { success: false, error: allCardsResult.error };
      }

      let cards = Object.values(allCardsResult.data!);

      // Apply filtering
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        cards = cards.filter(q => 
          q.front.toLowerCase().includes(searchTerm) ||
          q.back.toLowerCase().includes(searchTerm) ||
          q.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      if (options.tagFilter) {
        cards = cards.filter(q => q.tags.includes(options.tagFilter!));
      }

      // Apply sorting
      const sortBy = options.sortBy || 'due';
      const sortOrder = options.sortOrder || 'asc';
      
      cards.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'due':
            comparison = getEffectiveDueDate(a) - getEffectiveDueDate(b);
            break;
          case 'front':
            comparison = a.front.localeCompare(b.front);
            break;
          case 'created':
            comparison = a.created - b.created;
            break;
          case 'modified':
            comparison = a.modified - b.modified;
            break;
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Calculate pagination
      const totalCount = cards.length;
      const totalPages = Math.ceil(totalCount / options.limit);
      const currentPage = Math.max(1, Math.min(options.page, totalPages));
      
      // Apply pagination
      const startIndex = (currentPage - 1) * options.limit;
      const endIndex = startIndex + options.limit;
      const paginatedCards = cards.slice(startIndex, endIndex);

      return {
        success: true,
        data: {
          cards: paginatedCards,
          totalCount,
          totalPages,
          currentPage,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get paginated cards: ${error}`,
      };
    }
  }

  /**
   * Get specific card
   */
  static async getCard(id: string): Promise<StorageResult<Card | null>> {
    const result = await indexedDBManager.getCard(id);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * Create new card
   */
  static async createCard(cardData: Omit<Card, 'id' | 'created' | 'modified' | 'algorithm'>): Promise<StorageResult<Card>> {
    const id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const card: Card = {
      id,
      ...cardData,
      // Default isDraft to false if not provided
      isDraft: cardData.isDraft ?? false,
      created: now,
      modified: now,
      algorithm: SpacedRepetitionEngine.initializeNewCard(),
    };

    const result = await indexedDBManager.setCard(card);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    await this.updateStats();

    return { success: true, data: card };
  }

  /**
   * Update existing card
   */
  static async updateCard(
    id: string,
    updates: Partial<Omit<Card, 'id' | 'created'>>
  ): Promise<StorageResult<Card>> {
    const cardResult = await this.getCard(id);
    if (!cardResult.success) {
      return { success: false, error: cardResult.error };
    }

    if (!cardResult.data) {
      return { success: false, error: `Card ${id} not found` };
    }

    const updatedCard = {
      ...cardResult.data,
      ...updates,
      modified: Date.now(),
    };

    const result = await indexedDBManager.setCard(updatedCard);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: updatedCard };
  }

  /**
   * Remove card
   */
  static async removeCard(id: string): Promise<StorageResult<boolean>> {
    const result = await indexedDBManager.removeCard(id);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    await this.updateStats();

    return { success: true, data: true };
  }

  // =================== TAGS ===================

  static async getAllUniqueTagNames(): Promise<StorageResult<string[]>> {
    const result = await indexedDBManager.getAllUniqueTagNames();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result.data || [] };
  }

  /**
   * Get all tags
   */
  static async getAllTags(): Promise<StorageResult<Record<string, Tag>>> {
    const result = await indexedDBManager.getAllTags();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const tags: Record<string, Tag> = {};
    result.data?.forEach(tag => {
      tags[tag.id] = tag;
    });

    return { success: true, data: tags };
  }

  /**
   * Ensure tags exist - auto-create TagRecords for any new tag names
   * Used by createCard/updateCard to maintain normalized tag model
   */
  static async ensureTagsExist(tagNames: string[]): Promise<StorageResult<boolean>> {
    if (!tagNames || tagNames.length === 0) {
      return { success: true, data: true };
    }

    try {
      const allTagsResult = await this.getAllTags();
      if (!allTagsResult.success) {
        return { success: false, error: allTagsResult.error };
      }

      const existingTags = Object.values(allTagsResult.data!);
      const existingTagNames = new Set(existingTags.map(t => t.name.toLowerCase()));

      const tagsToCreate = tagNames.filter(
        name => name.trim() && !existingTagNames.has(name.toLowerCase())
      );

      for (const tagName of tagsToCreate) {
        const newTag: Tag = {
          id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: tagName.trim(),
          color: getRandomTagColor(),
          created: Date.now(),
        };

        const result = await indexedDBManager.setTag(newTag);
        if (!result.success) {
          return { success: false, error: `Failed to create tag "${tagName}": ${result.error}` };
        }
      }

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to ensure tags exist: ${error}`,
      };
    }
  }

  /**
   * Get specific tag
   */
  static async getTag(id: string): Promise<StorageResult<Tag | null>> {
    const result = await indexedDBManager.getTag(id);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }

  /**
   * Create new tag
   */
  static async createTag(tagData: Omit<Tag, 'id' | 'created'>): Promise<StorageResult<Tag>> {
    // Check for duplicate tag names
    const allTagsResult = await this.getAllTags();
    if (!allTagsResult.success) {
      return { success: false, error: allTagsResult.error };
    }

    const existingTag = Object.values(allTagsResult.data!).find(tag => 
      tag.name.toLowerCase() === tagData.name.toLowerCase()
    );
    if (existingTag) {
      return {
        success: false,
        error: `Tag with name "${tagData.name}" already exists`,
      };
    }

    const newTag: Tag = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...tagData,
      color: tagData.color || getRandomTagColor(),
      created: Date.now(),
    };

    const result = await indexedDBManager.setTag(newTag);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: newTag };
  }

  /**
   * Update existing tag
   */
  static async updateTag(
    id: string,
    updates: Partial<Omit<Tag, 'id' | 'created'>>
  ): Promise<StorageResult<Tag>> {
    const tagResult = await this.getTag(id);
    if (!tagResult.success) {
      return { success: false, error: tagResult.error };
    }

    if (!tagResult.data) {
      return { success: false, error: `Tag with id ${id} not found` };
    }

    // Check for duplicate names if name is being updated
    if (updates.name && updates.name !== tagResult.data.name) {
      const allTagsResult = await this.getAllTags();
      if (!allTagsResult.success) {
        return { success: false, error: allTagsResult.error };
      }

      const duplicateTag = Object.values(allTagsResult.data!).find(tag => 
        tag.id !== id && tag.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (duplicateTag) {
        return {
          success: false,
          error: `Tag with name "${updates.name}" already exists`,
        };
      }
    }

    const updatedTag = { ...tagResult.data, ...updates };
    const result = await indexedDBManager.setTag(updatedTag);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: updatedTag };
  }

  /**
   * Remove tag
   */
  static async removeTag(id: string): Promise<StorageResult<boolean>> {
    const tagResult = await this.getTag(id);
    if (!tagResult.success) {
      return { success: false, error: tagResult.error };
    }

    if (!tagResult.data) {
      return { success: false, error: `Tag with id ${id} not found` };
    }

    const tagToRemove = tagResult.data;

    // Remove tag from all cards that use it
    const allCardsResult = await this.getAllCards();
    if (allCardsResult.success) {
      const allCards = allCardsResult.data!;
      
      for (const card of Object.values(allCards)) {
        if (card.tags.includes(tagToRemove.name)) {
          card.tags = card.tags.filter(tagName => tagName !== tagToRemove.name);
          await indexedDBManager.setCard(card);
        }
      }
    }

    const result = await indexedDBManager.removeTag(id);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: true };
  }

  static async getCardsByTags(tagNames: string[]): Promise<StorageResult<Record<string, Card>>> {
    try {
      // If no tags specified, return all cards (fallback to old behavior)
      if (tagNames.length === 0) {
        const allCardsResult = await this.getAllCards();
        if (!allCardsResult.success) {
          return { success: false, error: allCardsResult.error };
        }
        return { success: true, data: allCardsResult.data! };
      }

      const result = await indexedDBManager.getCardsByTags(tagNames);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Convert array to Record for API compatibility
      const cardsRecord: Record<string, Card> = {};
      result.data?.forEach(card => {
        cardsRecord[card.id] = card;
      });

      return { success: true, data: cardsRecord };
    } catch (error) {
      return {
        success: false,
        error: `Failed to filter cards by tags: ${error}`,
      };
    }
  }

  static async getRandomCardFromTags(tagNames: string[]): Promise<StorageResult<Card | null>> {
    try {
      const filteredCardsResult = await this.getCardsByTags(tagNames);
      if (!filteredCardsResult.success) {
        return {
          success: false,
          error: filteredCardsResult.error,
        };
      }

      const cards = Object.values(filteredCardsResult.data!);
      if (cards.length === 0) {
        return { success: true, data: null };
      }

      const randomIndex = Math.floor(Math.random() * cards.length);
      return { success: true, data: cards[randomIndex] };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get random card from tags: ${error}`,
      };
    }
  }

  // =================== RESPONSES ===================

  /**
   * Get recent card responses
   */
  static async getResponses(): Promise<StorageResult<CardResponse[]>> {
    const result = await indexedDBManager.getRecentResponses();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Convert from IndexedDB format to app format
    const responses: CardResponse[] = result.data?.map((response: any) => ({
      cardId: response.cardId,
      timestamp: response.timestamp,
      difficulty: response.difficulty,
      responseTime: response.responseTime,
      wasCorrect: response.wasCorrect,
    })) || [];

    return { success: true, data: responses };
  }

  /**
   * Add card response
   */
  static async addResponse(response: CardResponse): Promise<StorageResult<boolean>> {
    const responseRecord = {
      cardId: response.cardId,
      timestamp: response.timestamp,
      difficulty: response.difficulty,
      responseTime: response.responseTime,
      wasCorrect: response.wasCorrect,
    };

    const result = await indexedDBManager.addCardResponse(responseRecord);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: true };
  }

  // =================== STORAGE STATS ===================

  /**
   * Get storage statistics
   */
  static async getStats(): Promise<StorageResult<StorageStats>> {
    const result = await indexedDBManager.getStorageStats();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (!result.data) {
      // Return default stats if not found
      const stats: StorageStats = {
        totalCards: 0,
        totalDomains: 0,
        storageUsed: 0,
        lastCleanup: Date.now(),
      };
      return { success: true, data: stats };
    }

    // Convert from IndexedDB format to app format
    const stats: StorageStats = {
      totalCards: result.data.data.totalCards,
      totalDomains: result.data.data.totalDomains,
      storageUsed: result.data.data.storageUsed,
      lastCleanup: result.data.data.lastCleanup,
    };

    return { success: true, data: stats };
  }

  /**
   * Update storage statistics
   */
  static async updateStats(): Promise<StorageResult<StorageStats>> {
    const [domainsResult, cardsResult] = await Promise.all([
      this.getAllDomains(),
      this.getAllCards(),
    ]);

    if (!domainsResult.success || !cardsResult.success) {
      return {
        success: false,
        error: 'Failed to get data for stats update',
      };
    }

    const totalDomains = Object.keys(domainsResult.data!).length;
    const totalCards = Object.keys(cardsResult.data!).length;

    // For IndexedDB, we use a more accurate storage calculation
    const storageUsed = totalCards * 1000 + totalDomains * 100; // Rough estimate

    const statsRecord: StorageStatsRecord = {
      key: 'stats',
      data: {
        totalCards,
        totalDomains,
        totalResponses: 0, // Would need to query responses to get count
        totalTags: 0, // Would need to query tags to get count
        storageUsed,
        lastCleanup: Date.now(),
      },
      lastUpdated: Date.now(),
    };

    const result = await indexedDBManager.updateStorageStats(statsRecord);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const stats: StorageStats = {
      totalCards,
      totalDomains,
      storageUsed,
      lastCleanup: Date.now(),
    };

    return { success: true, data: stats };
  }

  // =================== UTILITY METHODS ===================

  /**
   * Clear all storage data (for testing/reset)
   */
  static async clearAll(): Promise<StorageResult<boolean>> {
    try {
      // Clear all stores manually since there's no clearAll method
      const [domains, cards, tags, activeTags, responses] = await Promise.all([
        indexedDBManager.getAllDomains(),
        indexedDBManager.getAllCards(),
        indexedDBManager.getAllTags(),
        indexedDBManager.getActiveTags(),
        indexedDBManager.getRecentResponses(9999), // Get all responses
      ]);

      // Remove all domains
      if (domains.success && domains.data) {
        for (const domain of domains.data) {
          await indexedDBManager.removeDomain(domain.domain);
        }
      }

      // Remove all cards
      if (cards.success && cards.data) {
        for (const card of cards.data) {
          await indexedDBManager.removeCard(card.id);
        }
      }

      // Remove all tags
      if (tags.success && tags.data) {
        for (const tag of tags.data) {
          await indexedDBManager.removeTag(tag.id);
        }
      }

      // Remove all active tags
      if (activeTags.success && activeTags.data) {
        for (const activeTag of activeTags.data) {
          await indexedDBManager.removeActiveTag(activeTag.id);
        }
      }

      await this.initialize();
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: `Failed to clear storage: ${error}` };
    }
  }

  /**
   * Get storage usage information
   */
  static async getStorageUsage(): Promise<StorageResult<{
    used: number;
    available: number;
    percentage: number;
    nearLimit: boolean;
  }>> {
    try {
      // Update storage usage in performance monitor
      await performanceMonitor.updateStorageUsage();
      
      // Get quota status from IndexedDB quota manager
      const quotaResult = await indexedDBQuotaManager.getQuotaStatus();
      if (!quotaResult.success) {
        return { success: false, error: quotaResult.error };
      }

      const { totalUsedMB, availableMB, percentageUsed } = quotaResult.data!;
      
      // Convert to bytes for compatibility
      const usedBytes = totalUsedMB * 1024 * 1024;
      const availableBytes = availableMB * 1024 * 1024;
      const nearLimit = percentageUsed >= 80;

      return {
        success: true,
        data: {
          used: usedBytes,
          available: availableBytes,
          percentage: percentageUsed,
          nearLimit
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get storage usage: ${error}`,
      };
    }
  }

  // =================== ACTIVE TAGS MANAGEMENT ===================

  /**
   * Get all active tags (enabled for study sessions)
   */
  static async getActiveTags(): Promise<StorageResult<string[]>> {
    const result = await indexedDBManager.getActiveTags();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const tagNames = result.data?.map(tag => tag.tagName) || [];
    return { success: true, data: tagNames };
  }

  /**
   * Set active tags (overwrite all)
   */
  static async setActiveTags(tagNames: string[]): Promise<StorageResult<string[]>> {
    // First get all existing active tags to remove them
    const existingResult = await indexedDBManager.getActiveTags();
    if (existingResult.success && existingResult.data) {
      for (const activeTag of existingResult.data) {
        await indexedDBManager.removeActiveTag(activeTag.id);
      }
    }

    // Add new active tags
    for (const tagName of tagNames) {
      const activeTagRecord: ActiveTagRecord = {
        id: `active_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tagName,
        addedAt: Date.now(),
      };
      
      const addResult = await indexedDBManager.addActiveTag(activeTagRecord);
      if (!addResult.success) {
        return { success: false, error: addResult.error };
      }
    }

    return { success: true, data: tagNames };
  }

  /**
   * Add a tag to active tags
   */
  static async addActiveTag(tagName: string): Promise<StorageResult<string[]>> {
    // Check if tag is already active
    const existingResult = await this.getActiveTags();
    if (existingResult.success && existingResult.data?.includes(tagName)) {
      return existingResult; // Already active
    }

    const activeTagRecord: ActiveTagRecord = {
      id: `active_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tagName,
      addedAt: Date.now(),
    };

    const result = await indexedDBManager.addActiveTag(activeTagRecord);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return await this.getActiveTags();
  }

  /**
   * Remove a tag from active tags
   */
  static async removeActiveTag(tagName: string): Promise<StorageResult<string[]>> {
    // Get all active tags to find the one to remove
    const activeTagsResult = await indexedDBManager.getActiveTags();
    if (!activeTagsResult.success) {
      return { success: false, error: activeTagsResult.error };
    }

    const activeTagToRemove = activeTagsResult.data?.find(tag => tag.tagName === tagName);
    if (activeTagToRemove) {
      const result = await indexedDBManager.removeActiveTag(activeTagToRemove.id);
      if (!result.success) {
        return { success: false, error: result.error };
      }
    }

    return await this.getActiveTags();
  }

  /**
   * Get card summaries
   */
  static async getCardSummaries(): Promise<StorageResult<Record<string, CardSummary>>> {
    const result = await indexedDBManager.getAllCards();
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const summaries: Record<string, CardSummary> = {};
    result.data?.forEach(q => {
      // Create preview of back content (remove markdown and limit to 100 chars)
      const backPreview = q.back
        .replace(/[#*_`]/g, '') // Remove markdown
        .trim()
        .slice(0, 100);

      summaries[q.id] = {
        id: q.id,
        front: q.front,
        type: q.type,
        tags: q.tags,
        created: q.created,
        modified: q.modified,
        isDraft: q.isDraft,
        algorithm: q.algorithm,
        backPreview: backPreview + (q.back.length > 100 ? '...' : ''),
      };
    });

    return { success: true, data: summaries };
  }
} 