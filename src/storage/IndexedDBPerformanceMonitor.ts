/**
 * IndexedDB Performance Monitor
 * Tracks query performance, storage usage, and optimization recommendations
 */

import { PERFORMANCE_CONFIG } from './IndexedDBSchema';
import { IndexedDBManager } from './IndexedDBManager';

export interface PerformanceMetrics {
  queryTimes: {
    operation: string;
    duration: number;
    timestamp: number;
  }[];
  storageUsage: {
    totalSize: number;
    storeBreakdown: Record<string, number>;
    estimatedRecords: Record<string, number>;
    lastUpdated: number;
  };
  slowQueries: {
    operation: string;
    duration: number;
    timestamp: number;
    details: any;
  }[];
  recommendations: string[];
}

export class IndexedDBPerformanceMonitor {
  private static instance: IndexedDBPerformanceMonitor;
  private metrics: PerformanceMetrics = {
    queryTimes: [],
    storageUsage: {
      totalSize: 0,
      storeBreakdown: {},
      estimatedRecords: {},
      lastUpdated: 0
    },
    slowQueries: [],
    recommendations: []
  };
  
  private concurrentTransactions = 0;
  private maxConcurrentTransactions = 0;

  static getInstance(): IndexedDBPerformanceMonitor {
    if (!IndexedDBPerformanceMonitor.instance) {
      IndexedDBPerformanceMonitor.instance = new IndexedDBPerformanceMonitor();
    }
    return IndexedDBPerformanceMonitor.instance;
  }

  /**
   * Track operation performance
   */
  trackOperation<T>(operation: string, promise: Promise<T>, details?: any): Promise<T> {
    const startTime = performance.now();
    
    return promise.then(
      result => {
        const duration = performance.now() - startTime;
        this.recordMetric(operation, duration, details);
        return result;
      },
      error => {
        const duration = performance.now() - startTime;
        this.recordMetric(operation, duration, { ...details, error: error.message });
        throw error;
      }
    );
  }

  /**
   * Record performance metric
   */
  private recordMetric(operation: string, duration: number, details?: any): void {
    const timestamp = Date.now();
    
    // Add to query times
    this.metrics.queryTimes.push({ operation, duration, timestamp });
    
    // Keep only last 1000 metrics
    if (this.metrics.queryTimes.length > 1000) {
      this.metrics.queryTimes = this.metrics.queryTimes.slice(-1000);
    }
    
    // Track slow queries
    if (duration > PERFORMANCE_CONFIG.PERFORMANCE_MONITORING.SLOW_QUERY_THRESHOLD_MS) {
      this.metrics.slowQueries.push({ operation, duration, timestamp, details });
      
      // Keep only last 100 slow queries
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries = this.metrics.slowQueries.slice(-100);
      }
    }
    
    // Update recommendations
    this.updateRecommendations();
  }

  /**
   * Track concurrent transactions
   */
  trackTransactionStart(): void {
    this.concurrentTransactions++;
    this.maxConcurrentTransactions = Math.max(this.maxConcurrentTransactions, this.concurrentTransactions);
  }

  trackTransactionEnd(): void {
    this.concurrentTransactions = Math.max(0, this.concurrentTransactions - 1);
  }

  /**
   * Update storage usage metrics
   */
  async updateStorageUsage(): Promise<void> {
    try {
      const usage = await this.calculateStorageUsage();
      this.metrics.storageUsage = {
        ...usage,
        lastUpdated: Date.now()
      };
      this.updateRecommendations();
    } catch (error) {
      console.error('Failed to update storage usage:', error);
    }
  }

  /**
   * Calculate estimated storage usage
   */
  private async calculateStorageUsage(): Promise<{
    totalSize: number;
    storeBreakdown: Record<string, number>;
    estimatedRecords: Record<string, number>;
  }> {
    const storeBreakdown: Record<string, number> = {};
    const estimatedRecords: Record<string, number> = {};
    let totalSize = 0;

    const { ESTIMATED_RECORD_SIZES } = PERFORMANCE_CONFIG.STORAGE_QUOTAS;

    const indexedDBManager = IndexedDBManager.getInstance();

    // Get cards count and size
    const cardsResult = await indexedDBManager.getAllCards();
    if (cardsResult.success && cardsResult.data) {
      const cardsCount = cardsResult.data.length;
      const cardsSize = cardsCount * ESTIMATED_RECORD_SIZES.CARD;
      storeBreakdown.cards = cardsSize;
      estimatedRecords.cards = cardsCount;
      totalSize += cardsSize;
    }

    // Get domains count and size
    const domainsResult = await indexedDBManager.getAllDomains();
    if (domainsResult.success && domainsResult.data) {
      const domainsCount = domainsResult.data.length;
      const domainsSize = domainsCount * ESTIMATED_RECORD_SIZES.DOMAIN;
      storeBreakdown.domains = domainsSize;
      estimatedRecords.domains = domainsCount;
      totalSize += domainsSize;
    }

    // Get responses count and size
    const responsesResult = await indexedDBManager.getRecentResponses(365);
    if (responsesResult.success && responsesResult.data) {
      const responsesCount = responsesResult.data.length;
      const responsesSize = responsesCount * ESTIMATED_RECORD_SIZES.RESPONSE;
      storeBreakdown.responses = responsesSize;
      estimatedRecords.responses = responsesCount;
      totalSize += responsesSize;
    }

    // Get tags count and size
    const tagsResult = await indexedDBManager.getAllTags();
    if (tagsResult.success && tagsResult.data) {
      const tagsCount = tagsResult.data.length;
      const tagsSize = tagsCount * ESTIMATED_RECORD_SIZES.TAG;
      storeBreakdown.tags = tagsSize;
      estimatedRecords.tags = tagsCount;
      totalSize += tagsSize;
    }

    // Get active tags count and size
    const activeTagsResult = await indexedDBManager.getActiveTags();
    if (activeTagsResult.success && activeTagsResult.data) {
      const activeTagsCount = activeTagsResult.data.length;
      const activeTagsSize = activeTagsCount * ESTIMATED_RECORD_SIZES.ACTIVE_TAG;
      storeBreakdown.activeTags = activeTagsSize;
      estimatedRecords.activeTags = activeTagsCount;
      totalSize += activeTagsSize;
    }

    return { totalSize, storeBreakdown, estimatedRecords };
  }

  /**
   * Update performance recommendations
   */
  private updateRecommendations(): void {
    const recommendations: string[] = [];
    const { STORAGE_LIMITS, PERFORMANCE_MONITORING } = PERFORMANCE_CONFIG;

    // Storage status notifications (no cleanup suggestions)
    // Note: We don't track percentage here since it's calculated dynamically in IndexedDBQuotaManager
    const totalSizeMB = this.metrics.storageUsage.totalSize / (1024 * 1024);

    // Performance recommendations only
    const recentSlowQueries = this.metrics.slowQueries.filter(
      q => Date.now() - q.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentSlowQueries.length > 5) {
      recommendations.push('Multiple slow queries detected. Consider optimizing query patterns.');
    }

    if (this.maxConcurrentTransactions > PERFORMANCE_MONITORING.MAX_CONCURRENT_TRANSACTIONS) {
      recommendations.push('High concurrent transaction count. Consider batching operations.');
    }

    // Query-specific recommendations for performance only
    const commonSlowOperations = this.getCommonSlowOperations();
    if (commonSlowOperations.length > 0) {
      recommendations.push(`Common slow operations: ${commonSlowOperations.join(', ')}`);
    }

    this.metrics.recommendations = recommendations;
  }

  /**
   * Get common slow operations
   */
  private getCommonSlowOperations(): string[] {
    const operationCounts: Record<string, number> = {};
    
    this.metrics.slowQueries.forEach(query => {
      operationCounts[query.operation] = (operationCounts[query.operation] || 0) + 1;
    });

    return Object.entries(operationCounts)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([operation]) => operation);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageQueryTime: number;
    slowQueriesCount: number;
    storageUsageMB: number;
    concurrentTransactions: number;
    recommendations: string[];
  } {
    const recentQueries = this.metrics.queryTimes.filter(
      q => Date.now() - q.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    const averageQueryTime = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length
      : 0;

    return {
      averageQueryTime,
      slowQueriesCount: this.metrics.slowQueries.length,
      storageUsageMB: this.metrics.storageUsage.totalSize / (1024 * 1024),
      concurrentTransactions: this.concurrentTransactions,
      recommendations: this.metrics.recommendations
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = {
      queryTimes: [],
      storageUsage: {
        totalSize: 0,
        storeBreakdown: {},
        estimatedRecords: {},
        lastUpdated: 0
      },
      slowQueries: [],
      recommendations: []
    };
    this.concurrentTransactions = 0;
    this.maxConcurrentTransactions = 0;
  }
}

// Export singleton instance
export const performanceMonitor = IndexedDBPerformanceMonitor.getInstance(); 