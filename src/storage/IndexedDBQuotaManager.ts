/**
 * IndexedDB Storage Quota Manager
 * Handles browser storage quotas, cleanup operations, and data eviction for IndexedDB
 */

import { IndexedDBManager } from './IndexedDBManager';
import { performanceMonitor } from './IndexedDBPerformanceMonitor';
import { PERFORMANCE_CONFIG } from './IndexedDBSchema';
import { StorageResult } from './StorageManager';
import { t } from '../utils/i18n';

export interface IndexedDBQuotaStatus {
  totalUsedMB: number;
  availableMB: number;
  percentageUsed: number;
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
  browserQuotaMB: number;
  recommendations: string[];
  storeBreakdown: Record<string, { sizeMB: number; records: number }>;
}

export interface CleanupResult {
  spaceFreedMB: number;
  recordsRemoved: number;
  cleanupActions: string[];
  newTotalMB: number;
}

export class IndexedDBQuotaManager {
  private static instance: IndexedDBQuotaManager;

  static getInstance(): IndexedDBQuotaManager {
    if (!IndexedDBQuotaManager.instance) {
      IndexedDBQuotaManager.instance = new IndexedDBQuotaManager();
    }
    return IndexedDBQuotaManager.instance;
  }

  /**
   * Get current storage quota status
   */
  async getQuotaStatus(): Promise<StorageResult<IndexedDBQuotaStatus>> {
    try {
      // Update storage usage first
      await performanceMonitor.updateStorageUsage();
      
      const metrics = performanceMonitor.getMetrics();
      const browserQuota = await this.getBrowserStorageQuota();
      
      const totalUsedMB = metrics.storageUsage.totalSize / (1024 * 1024);
      const availableMB = browserQuota - totalUsedMB;
      const percentageUsed = (totalUsedMB / browserQuota) * 100;
      
      const { STORAGE_LIMITS } = PERFORMANCE_CONFIG;
      let status: 'safe' | 'warning' | 'critical' | 'exceeded';
      
      if (percentageUsed >= STORAGE_LIMITS.FULL_THRESHOLD_PERCENTAGE) {
        status = 'exceeded';
      } else if (percentageUsed >= STORAGE_LIMITS.CRITICAL_THRESHOLD_PERCENTAGE) {
        status = 'critical';
      } else if (percentageUsed >= STORAGE_LIMITS.WARNING_THRESHOLD_PERCENTAGE) {
        status = 'warning';
      } else {
        status = 'safe';
      }
      
      const recommendations = this.generateRecommendations(status, totalUsedMB, metrics);
      
      const storeBreakdown = this.formatStoreBreakdown(
        metrics.storageUsage.storeBreakdown,
        metrics.storageUsage.estimatedRecords
      );
      
      return {
        success: true,
        data: {
          totalUsedMB,
          availableMB,
          percentageUsed,
          status,
          browserQuotaMB: browserQuota,
          recommendations,
          storeBreakdown
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get quota status: ${error}`
      };
    }
  }

  /**
   * Get browser storage quota (IndexedDB-specific)
   */
  private async getBrowserStorageQuota(): Promise<number> {
    try {
      if ('navigator' in globalThis && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota) {
          return estimate.quota / (1024 * 1024); // Convert to MB
        }
      }
      
      // Fallback to reasonable default (Chrome typically gives 60%+ of disk space)
      return PERFORMANCE_CONFIG.STORAGE_QUOTAS.FALLBACK_QUOTA_MB;
    } catch (error) {
      console.warn('Failed to get browser storage quota:', error);
      return PERFORMANCE_CONFIG.STORAGE_QUOTAS.FALLBACK_QUOTA_MB;
    }
  }

  /**
   * Generate recommendations based on storage status
   */
  private generateRecommendations(
    status: string,
    totalUsedMB: number,
    metrics: any
  ): string[] {
    const recommendations: string[] = [];
    
    switch (status) {
      case 'exceeded':
        recommendations.push(t('storageRecommendationExceeded1'));
        recommendations.push(t('storageRecommendationExceeded2'));
        break;
        
      case 'critical':
        recommendations.push(t('storageRecommendationCritical1'));
        recommendations.push(t('storageRecommendationCritical2'));
        break;
        
      case 'warning':
        recommendations.push(t('storageRecommendationWarning1'));
        recommendations.push(t('storageRecommendationWarning2'));
        break;
        
      case 'safe':
        recommendations.push(t('storageRecommendationSafe'));
        break;
    }
    
    // Add storage breakdown info (but no automatic cleanup suggestions)
    const storeBreakdown = metrics.storageUsage.storeBreakdown;
    const largestStore = Object.entries(storeBreakdown)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];
    
    if (largestStore) {
      const [storeName, sizeBytes] = largestStore;
      const sizeMB = (sizeBytes as number) / (1024 * 1024);
      
      if (sizeMB > 10) {
        recommendations.push(t('storageDataUsage', [storeName, sizeMB.toFixed(1)]));
      }
    }
    
    return recommendations;
  }

  /**
   * Format store breakdown for display
   */
  private formatStoreBreakdown(
    storeBreakdown: Record<string, number>,
    estimatedRecords: Record<string, number>
  ): Record<string, { sizeMB: number; records: number }> {
    const formatted: Record<string, { sizeMB: number; records: number }> = {};
    
    for (const [store, sizeBytes] of Object.entries(storeBreakdown)) {
      formatted[store] = {
        sizeMB: sizeBytes / (1024 * 1024),
        records: estimatedRecords[store] || 0
      };
    }
    
    return formatted;
  }

  /**
   * Get storage status notification
   * No automatic cleanup - only provides user notification
   */
  async getStorageNotification(): Promise<StorageResult<{
    needsAttention: boolean;
    message: string;
    actionRequired: 'none' | 'monitor' | 'upgrade_or_cleanup';
    usageMB: number;
    percentageUsed: number;
  }>> {
    try {
      const quotaStatus = await this.getQuotaStatus();
      if (!quotaStatus.success) {
        return { success: false, error: quotaStatus.error };
      }

      const { status, totalUsedMB, percentageUsed } = quotaStatus.data!;

      let needsAttention = false;
      let message = '';
      let actionRequired: 'none' | 'monitor' | 'upgrade_or_cleanup' = 'none';

      switch (status) {
        case 'exceeded':
          needsAttention = true;
          message = t('storageNotificationExceeded');
          actionRequired = 'upgrade_or_cleanup';
          break;
          
        case 'critical':
          needsAttention = true;
          message = t('storageNotificationCritical');
          actionRequired = 'upgrade_or_cleanup';
          break;
          
        case 'warning':
          needsAttention = true;
          message = t('storageNotificationWarning');
          actionRequired = 'monitor';
          break;
          
        case 'safe':
          message = t('storageNotificationSafe');
          actionRequired = 'none';
          break;
      }

      return {
        success: true,
        data: {
          needsAttention,
          message,
          actionRequired,
          usageMB: totalUsedMB,
          percentageUsed
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get storage notification: ${error}`
      };
    }
  }

  /**
   * Manual cleanup helper for user-initiated deletions
   * This should only be called when user explicitly chooses to delete data
   */
  async getCleanupSuggestions(): Promise<StorageResult<{
    oldResponsesCount: number;
    largestStores: Array<{ name: string; sizeMB: number; records: number }>;
    message: string;
  }>> {
    try {
      const indexedDBManager = IndexedDBManager.getInstance();
      
      // Get old responses count (but don't delete them)
      const responsesResult = await indexedDBManager.getRecentResponses(365);
      const oldResponsesCount = responsesResult.success && responsesResult.data 
        ? responsesResult.data.filter(r => r.timestamp < Date.now() - (90 * 24 * 60 * 60 * 1000)).length 
        : 0;

             // Get storage breakdown
       const breakdownResult = await this.getStorageBreakdown();
       if (!breakdownResult.success) {
         return { success: false, error: breakdownResult.error };
       }

       const { storeBreakdown } = breakdownResult.data!;
       const largestStores = Object.entries(storeBreakdown)
         .map(([name, data]) => ({
           name,
           sizeMB: data.sizeMB,
           records: data.records
         }))
         .sort((a, b) => b.sizeMB - a.sizeMB)
         .slice(0, 5);

             return {
         success: true,
         data: {
           oldResponsesCount,
           largestStores,
           message: 'These are suggestions only. You decide what to delete manually.'
         }
       };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get cleanup suggestions: ${error}`
      };
    }
  }

  /**
   * Update storage statistics
   */
  private async updateStorageStats(): Promise<void> {
    try {
      await performanceMonitor.updateStorageUsage();
      
      const metrics = performanceMonitor.getMetrics();
      const stats = {
        key: 'stats' as const,
        data: {
          totalCards: metrics.storageUsage.estimatedRecords.cards || 0,
          totalDomains: metrics.storageUsage.estimatedRecords.domains || 0,
          totalResponses: metrics.storageUsage.estimatedRecords.responses || 0,
          totalTags: metrics.storageUsage.estimatedRecords.tags || 0,
          storageUsed: metrics.storageUsage.totalSize,
          lastCleanup: Date.now()
        },
        lastUpdated: Date.now()
      };

      const indexedDBManager = IndexedDBManager.getInstance();
      await indexedDBManager.updateStorageStats(stats);
    } catch (error) {
      console.error('Failed to update storage stats:', error);
    }
  }

  /**
   * Get storage breakdown for analysis
   */
  async getStorageBreakdown(): Promise<StorageResult<{
    totalMB: number;
    storeBreakdown: Record<string, { sizeMB: number; records: number; percentage: number }>;
    topStores: Array<{ name: string; sizeMB: number; percentage: number }>;
  }>> {
    try {
      const quotaStatus = await this.getQuotaStatus();
      if (!quotaStatus.success) {
        return { success: false, error: quotaStatus.error };
      }

      const { totalUsedMB, storeBreakdown } = quotaStatus.data!;
      
      const breakdown: Record<string, { sizeMB: number; records: number; percentage: number }> = {};
      
      for (const [store, data] of Object.entries(storeBreakdown)) {
        breakdown[store] = {
          sizeMB: data.sizeMB,
          records: data.records,
          percentage: (data.sizeMB / totalUsedMB) * 100
        };
      }

      const topStores = Object.entries(breakdown)
        .map(([name, data]) => ({
          name,
          sizeMB: data.sizeMB,
          percentage: data.percentage
        }))
        .sort((a, b) => b.sizeMB - a.sizeMB)
        .slice(0, 5);

      return {
        success: true,
        data: {
          totalMB: totalUsedMB,
          storeBreakdown: breakdown,
          topStores
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get storage breakdown: ${error}`
      };
    }
  }
}

// Export singleton instance
export const indexedDBQuotaManager = IndexedDBQuotaManager.getInstance(); 