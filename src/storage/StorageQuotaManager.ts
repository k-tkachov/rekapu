import { StorageManager, StorageResult } from './StorageManager';
import { indexedDBQuotaManager } from './IndexedDBQuotaManager';
import { 
  STORAGE_KEYS,
} from '../types/storage';

/**
 * Storage quota management utilities
 * Delegates to IndexedDBQuotaManager for all operations
 */
export class StorageQuotaManager {
  /**
   * Check if storage is approaching or exceeding limits
   */
  static async checkQuotaStatus(): Promise<StorageResult<{
    usage: number;
    available: number;
    percentage: number;
    status: 'safe' | 'warning' | 'critical' | 'exceeded';
    recommendations: string[];
  }>> {
    try {
      // Use the new IndexedDB quota manager for consistent behavior
      const quotaResult = await indexedDBQuotaManager.getQuotaStatus();
      if (!quotaResult.success) {
        return {
          success: false,
          error: quotaResult.error,
        };
      }

      const { totalUsedMB, availableMB, percentageUsed, status, recommendations } = quotaResult.data!;
      
      // Convert to bytes for compatibility
      const usageBytes = totalUsedMB * 1024 * 1024;
      const availableBytes = availableMB * 1024 * 1024;

      return {
        success: true,
        data: {
          usage: usageBytes,
          available: availableBytes,
          percentage: percentageUsed,
          status,
          recommendations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to check quota status: ${error}`,
      };
    }
  }

  /**
   * Clean up old response data to free space
   * Note: This method does nothing. Deleting response history would break spaced repetition algorithms.
   */
  static async cleanupOldResponses(keepCount: number = 50): Promise<StorageResult<{
    cleaned: number;
    remaining: number;
    spaceFreed: number;
  }>> {
    return {
      success: true,
      data: {
        cleaned: 0,
        remaining: 0,
        spaceFreed: 0,
      },
    };
  }

  /**
   * Remove unused or old cards
   */
  static async cleanupOldCards(olderThanDays: number = 365): Promise<StorageResult<{
    cleaned: number;
    remaining: number;
    spaceFreed: number;
  }>> {
    try {
      const cardsResult = await StorageManager.getAllCards();
      if (!cardsResult.success) {
        return {
          success: false,
          error: cardsResult.error,
        };
      }

      const cards = cardsResult.data!;
      const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      const originalSize = JSON.stringify(cards).length;
      
      let cleanedCount = 0;
      const cardsToKeep: Record<string, any> = {};

      // Keep cards that are newer than cutoff or have been answered recently
      for (const [id, card] of Object.entries(cards)) {
        // Keep if created recently
        if (card.created > cutoffDate) {
          cardsToKeep[id] = card;
          continue;
        }

        // Keep if modified recently (indicates active use)
        if (card.modified > cutoffDate) {
          cardsToKeep[id] = card;
          continue;
        }

        // Keep if due for review soon (indicates it's in active learning)
        if (card.algorithm.dueDate < Date.now() + (7 * 24 * 60 * 60 * 1000)) {
          cardsToKeep[id] = card;
          continue;
        }

        // This card can be cleaned up
        cleanedCount++;
      }

      if (cleanedCount === 0) {
        return {
          success: true,
          data: {
            cleaned: 0,
            remaining: Object.keys(cards).length,
            spaceFreed: 0,
          },
        };
      }

      // Update storage with cleaned cards
      await chrome.storage.sync.set({
        [STORAGE_KEYS.CARDS]: cardsToKeep,
      });

      const newSize = JSON.stringify(cardsToKeep).length;
      await StorageManager.updateStats();

      return {
        success: true,
        data: {
          cleaned: cleanedCount,
          remaining: Object.keys(cardsToKeep).length,
          spaceFreed: originalSize - newSize,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to cleanup cards: ${error}`,
      };
    }
  }

  /**
   * Get storage notification for user guidance
   */
  static async performAutoCleanup(): Promise<StorageResult<{
    totalSpaceFreed: number;
    cleanupActions: string[];
  }>> {
    try {
      // No automatic cleanup - just provide notification
      const notificationResult = await indexedDBQuotaManager.getStorageNotification();
      if (!notificationResult.success) {
        return {
          success: false,
          error: notificationResult.error,
        };
      }

      const { message, needsAttention } = notificationResult.data!;
      
      return {
        success: true,
        data: {
          totalSpaceFreed: 0,
          cleanupActions: needsAttention ? [message] : ['Storage is healthy - no action needed'],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get storage notification: ${error}`,
      };
    }
  }

  /**
   * Get detailed storage breakdown by category
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
    try {
      const allData = await chrome.storage.sync.get(null);
      
      const breakdown = {
        settings: JSON.stringify(allData[STORAGE_KEYS.GLOBAL_SETTINGS] || {}).length,
        domains: JSON.stringify(allData[STORAGE_KEYS.DOMAINS] || {}).length,
        cards: JSON.stringify(allData[STORAGE_KEYS.CARDS] || {}).length,
        responses: JSON.stringify(allData[STORAGE_KEYS.RESPONSES] || []).length,
        stats: JSON.stringify(allData[STORAGE_KEYS.STATS] || {}).length,
      };

      const total = Object.values(breakdown).reduce((sum, size) => sum + size, 0);

      const percentages = {
        settings: total > 0 ? (breakdown.settings / total) * 100 : 0,
        domains: total > 0 ? (breakdown.domains / total) * 100 : 0,
        cards: total > 0 ? (breakdown.cards / total) * 100 : 0,
        responses: total > 0 ? (breakdown.responses / total) * 100 : 0,
        stats: total > 0 ? (breakdown.stats / total) * 100 : 0,
      };

      return {
        success: true,
        data: {
          total,
          breakdown,
          percentages,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get storage breakdown: ${error}`,
      };
    }
  }

  /**
   * Validate that a new data addition won't exceed quotas
   */
  static async validateStorageSpace(estimatedSize: number): Promise<StorageResult<{
    canStore: boolean;
    currentUsage: number;
    availableSpace: number;
    recommendation?: string;
  }>> {
    try {
      const usageResult = await StorageManager.getStorageUsage();
      if (!usageResult.success) {
        return {
          success: false,
          error: usageResult.error,
        };
      }

      const { used, available } = usageResult.data!;
      const canStore = estimatedSize <= available;
      
      let recommendation: string | undefined;
      if (!canStore) {
        if (available < 1000) {
          recommendation = 'Storage nearly full. Please clean up old data.';
        } else {
          recommendation = 'Not enough space. Consider removing old cards or responses.';
        }
      }

      return {
        success: true,
        data: {
          canStore,
          currentUsage: used,
          availableSpace: available,
          recommendation,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to validate storage space: ${error}`,
      };
    }
  }
} 