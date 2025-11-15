import { StorageResult } from './StorageManager';
import { GlobalSettings, DomainSettings, CardResponse, StorageStats } from '../types/storage';
import { Card, CardSummary, Tag } from '../types';

/**
 * Client-side storage API that communicates with background script
 * Use this in popup and content scripts instead of StorageManager directly
 */
export class StorageAPI {
  /**
   * Send message to background script and wait for response
   */
  private static async sendMessage(action: string, data?: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, data }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          resolve(response);
        }
      });
    });
  }

  // =================== GLOBAL SETTINGS ===================

  /**
   * Get global settings
   */
  static async getGlobalSettings(): Promise<StorageResult<GlobalSettings>> {
    return this.sendMessage('storage_getGlobalSettings');
  }

  /**
   * Update global settings
   */
  static async updateGlobalSettings(updates: Partial<GlobalSettings>): Promise<StorageResult<GlobalSettings>> {
    return this.sendMessage('storage_updateGlobalSettings', updates);
  }

  // =================== DOMAINS ===================

  /**
   * Get count of domains (efficient - no data loading)
   */
  static async getDomainsCount(): Promise<StorageResult<number>> {
    return this.sendMessage('storage_getDomainsCount');
  }

  /**
   * Get all domain settings
   */
  static async getAllDomains(): Promise<StorageResult<Record<string, DomainSettings>>> {
    return this.sendMessage('storage_getAllDomains');
  }

  /**
   * Get domain settings
   */
  static async getDomain(domain: string): Promise<StorageResult<DomainSettings | null>> {
    return this.sendMessage('storage_getDomain', { domain });
  }

  /**
   * Add or update domain settings
   */
  static async setDomain(domain: string, settings: Partial<DomainSettings>): Promise<StorageResult<DomainSettings>> {
    return this.sendMessage('storage_setDomain', { domain, settings });
  }

  /**
   * Remove domain settings
   */
  static async removeDomain(domain: string): Promise<StorageResult<boolean>> {
    return this.sendMessage('storage_removeDomain', { domain });
  }

  /**
   * Check if a domain is blocked
   */
  static async checkDomainBlocked(domain: string): Promise<{ success: boolean; blocked: boolean; settings?: DomainSettings }> {
    return this.sendMessage('checkDomainBlocked', { domain });
  }

  /**
   * Unblock a domain
   */
  static async unblockDomain(domain: string): Promise<StorageResult<DomainSettings>> {
    return this.sendMessage('unblockDomain', { domain });
  }

  // =================== CARDS ===================

  /**
   * Get count of cards (efficient - no data loading)
   */
  static async getCardsCount(): Promise<StorageResult<number>> {
    return this.sendMessage('storage_getCardsCount');
  }

  /**
   * Get all card IDs (lightweight operation)
   */
  static async getCardIds(): Promise<StorageResult<string[]>> {
    return this.sendMessage('storage_getCardIds');
  }

  /**
   * Get a random card efficiently
   */
  static async getRandomCard(): Promise<StorageResult<Card | null>> {
    return this.sendMessage('storage_getRandomCard');
  }

  /**
   * Get all cards
   */
  static async getAllCards(): Promise<StorageResult<Record<string, Card>>> {
    return this.sendMessage('storage_getAllCards');
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
    return this.sendMessage('storage_getCardsPaginated', options);
  }

  /**
   * Get card summaries for better performance in list views
   */
  static async getCardSummaries(): Promise<StorageResult<Record<string, CardSummary>>> {
    return this.sendMessage('storage_getCardSummaries');
  }

  /**
   * Get a specific card by ID
   */
  static async getCard(id: string): Promise<StorageResult<Card>> {
    return this.sendMessage('storage_getCard', { id });
  }

  /**
   * Create new card
   */
  static async createCard(cardData: Omit<Card, 'id' | 'created' | 'modified' | 'algorithm'>): Promise<StorageResult<Card>> {
    return this.sendMessage('storage_createCard', cardData);
  }

  /**
   * Update existing card
   */
  static async updateCard(id: string, updates: Partial<Omit<Card, 'id' | 'created'>>): Promise<StorageResult<Card>> {
    return this.sendMessage('storage_updateCard', { id, updates });
  }

  /**
   * Remove card
   */
  static async removeCard(id: string): Promise<StorageResult<boolean>> {
    return this.sendMessage('storage_removeCard', { id });
  }

  // =================== TAGS ===================

  static async getAllUniqueTagNames(): Promise<StorageResult<string[]>> {
    return this.sendMessage('storage_getAllUniqueTagNames');
  }

  /**
   * Get all tags
   */
  static async getAllTags(): Promise<StorageResult<Record<string, Tag>>> {
    return this.sendMessage('storage_getAllTags');
  }

  /**
   * Ensure tags exist - auto-create TagRecords for new tag names
   * Used by CardForm to create tags before saving cards
   */
  static async ensureTagsExist(tagNames: string[]): Promise<StorageResult<boolean>> {
    return this.sendMessage('storage_ensureTagsExist', { tagNames });
  }

  /**
   * Get specific tag
   */
  static async getTag(id: string): Promise<StorageResult<Tag | null>> {
    return this.sendMessage('storage_getTag', { id });
  }

  /**
   * Create new tag
   */
  static async createTag(tagData: Omit<Tag, 'id' | 'created'>): Promise<StorageResult<Tag>> {
    return this.sendMessage('storage_createTag', tagData);
  }

  /**
   * Update existing tag
   */
  static async updateTag(id: string, updates: Partial<Omit<Tag, 'id' | 'created'>>): Promise<StorageResult<Tag>> {
    return this.sendMessage('storage_updateTag', { id, updates });
  }

  /**
   * Remove tag
   */
  static async removeTag(id: string): Promise<StorageResult<boolean>> {
    return this.sendMessage('storage_removeTag', { id });
  }

  /**
   * Get cards filtered by tags (Anki-style deck functionality)
   */
  static async getCardsByTags(tagNames: string[]): Promise<StorageResult<Record<string, Card>>> {
    return this.sendMessage('storage_getCardsByTags', { tagNames });
  }

  /**
   * Get a random card from specified tags (for study sessions)
   */
  static async getRandomCardFromTags(tagNames: string[]): Promise<StorageResult<Card | null>> {
    return this.sendMessage('storage_getRandomCardFromTags', { tagNames });
  }

  // =================== RESPONSES ===================

  /**
   * Get responses
   */
  static async getResponses(): Promise<StorageResult<CardResponse[]>> {
    return this.sendMessage('storage_getResponses');
  }

  /**
   * Add card response
   */
  static async addResponse(response: CardResponse): Promise<StorageResult<boolean>> {
    return this.sendMessage('storage_addResponse', response);
  }

  // =================== STORAGE STATS ===================

  /**
   * Get storage stats
   */
  static async getStats(): Promise<StorageResult<StorageStats>> {
    return this.sendMessage('storage_getStats');
  }

  /**
   * Get storage usage
   */
  static async getStorageUsage(): Promise<StorageResult<{
    used: number;
    available: number;
    percentage: number;
    nearLimit: boolean;
  }>> {
    return this.sendMessage('storage_getStorageUsage');
  }

  /**
   * Clear all storage
   */
  static async clearAll(): Promise<StorageResult<boolean>> {
    return this.sendMessage('storage_clearAll');
  }

  // =================== QUOTA MANAGEMENT ===================

  /**
   * Check quota status
   */
  static async checkQuotaStatus(): Promise<StorageResult<{
    usage: number;
    available: number;
    percentage: number;
    status: 'safe' | 'warning' | 'critical' | 'exceeded';
    recommendations: string[];
  }>> {
    return this.sendMessage('quota_checkStatus');
  }

  /**
   * Perform auto cleanup
   */
  static async performAutoCleanup(): Promise<StorageResult<{
    totalSpaceFreed: number;
    cleanupActions: string[];
  }>> {
    return this.sendMessage('quota_cleanup');
  }

  /**
   * Cleanup old responses
   */
  static async cleanupOldResponses(keepCount?: number): Promise<StorageResult<{
    cleaned: number;
    remaining: number;
    spaceFreed: number;
  }>> {
    return this.sendMessage('quota_cleanupResponses', { keepCount });
  }

  /**
   * Cleanup old cards
   */
  static async cleanupOldCards(olderThanDays?: number): Promise<StorageResult<{
    cleaned: number;
    remaining: number;
    spaceFreed: number;
  }>> {
    return this.sendMessage('quota_cleanupCards', { olderThanDays });
  }

  /**
   * Get storage breakdown
   */
  static async getStorageBreakdown(): Promise<StorageResult<{
    total: number;
    breakdown: {
      settings: number;
      domains: number;
      cards: number;
      responses: number;
      stats: number;
    };
    percentages: {
      settings: number;
      domains: number;
      cards: number;
      responses: number;
      stats: number;
    };
  }>> {
    return this.sendMessage('quota_getBreakdown');
  }

  /**
   * Validate storage space
   */
  static async validateStorageSpace(size: number): Promise<StorageResult<{
    canStore: boolean;
    currentUsage: number;
    availableSpace: number;
    recommendation?: string;
  }>> {
    return this.sendMessage('quota_validateSpace', { size });
  }

  // =================
  // Active Tags Management
  // =================

  /**
   * Get all active tags (enabled for study sessions)
   */
  static async getActiveTags(): Promise<StorageResult<string[]>> {
    return await this.sendMessage('storage_getActiveTags');
  }

  /**
   * Set active tags (overwrite all)
   */
  static async setActiveTags(tagNames: string[]): Promise<StorageResult<string[]>> {
    return await this.sendMessage('storage_setActiveTags', { tagNames });
  }

  /**
   * Add a tag to active tags
   */
  static async addActiveTag(tagName: string): Promise<StorageResult<string[]>> {
    return await this.sendMessage('storage_addActiveTag', { tagName });
  }

  /**
   * Remove a tag from active tags
   */
  static async removeActiveTag(tagName: string): Promise<StorageResult<string[]>> {
    return await this.sendMessage('storage_removeActiveTag', { tagName });
  }
} 