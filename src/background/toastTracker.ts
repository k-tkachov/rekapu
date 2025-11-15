interface DailyToastRecord {
  domain: string;
  lastShownTimestamp: number;
  lastShownDate: string; // YYYY-MM-DD format
  showCount: number;
}

interface ToastTrackingData {
  records: Record<string, DailyToastRecord>;
  lastCleanup: number;
}

class DailyToastTracker {
  private static readonly STORAGE_KEY = 'rekapu_daily_toasts';
  private static readonly CLEANUP_INTERVAL_DAYS = 7;
  private static readonly CLEANUP_THRESHOLD_DAYS = 30;

  /**
   * Check if a celebratory toast should be shown for a domain today
   */
  static async shouldShowToast(domain: string): Promise<boolean> {
    try {
      const data = await this.getTrackingData();
      const today = this.getTodayDateString();
      const record = data.records[domain];

      if (!record) {
        return true;
      }

      return record.lastShownDate !== today;
    } catch (error) {
      console.error('Error checking toast eligibility:', error);
      return true;
    }
  }

  /**
   * Record that a celebratory toast was shown for a domain today
   */
  static async recordToastShown(domain: string): Promise<void> {
    try {
      const data = await this.getTrackingData();
      const now = Date.now();
      const today = this.getTodayDateString();

      data.records[domain] = {
        domain,
        lastShownTimestamp: now,
        lastShownDate: today,
        showCount: (data.records[domain]?.showCount || 0) + 1
      };

      await this.saveTrackingData(data);
      
      this.performCleanupIfNeeded(data);
    } catch (error) {
      console.error('Error recording toast shown:', error);
    }
  }

  /**
   * Get the current tracking data from storage
   */
  private static async getTrackingData(): Promise<ToastTrackingData> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      const stored = result[this.STORAGE_KEY];

      if (stored) {
        return {
          records: stored.records || {},
          lastCleanup: stored.lastCleanup || Date.now()
        };
      }

      return {
        records: {},
        lastCleanup: Date.now()
      };
    } catch (error) {
      console.error('Error getting tracking data:', error);
      return {
        records: {},
        lastCleanup: Date.now()
      };
    }
  }

  /**
   * Save tracking data to storage
   */
  private static async saveTrackingData(data: ToastTrackingData): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: data
      });
    } catch (error) {
      console.error('Error saving tracking data:', error);
    }
  }

  /**
   * Get today's date as YYYY-MM-DD string in local timezone
   */
  private static getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Perform cleanup if needed (removes old records)
   */
  private static async performCleanupIfNeeded(data: ToastTrackingData): Promise<void> {
    const now = Date.now();
    const timeSinceLastCleanup = now - data.lastCleanup;
    const cleanupIntervalMs = this.CLEANUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

    if (timeSinceLastCleanup < cleanupIntervalMs) {
      return;
    }

    await this.performCleanup();
  }

  /**
   * Manually perform cleanup of old records
   */
  static async performCleanup(): Promise<{ removedCount: number; totalRecords: number }> {
    try {
      const data = await this.getTrackingData();
      const now = Date.now();
      const thresholdMs = this.CLEANUP_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
      const cutoffTime = now - thresholdMs;

      let removedCount = 0;
      const cleanedRecords: Record<string, DailyToastRecord> = {};

      for (const [domain, record] of Object.entries(data.records)) {
        if (record.lastShownTimestamp >= cutoffTime) {
          cleanedRecords[domain] = record;
        } else {
          removedCount++;
        }
      }

      const cleanedData: ToastTrackingData = {
        records: cleanedRecords,
        lastCleanup: now
      };

      await this.saveTrackingData(cleanedData);

      console.log(`Toast tracker cleanup: removed ${removedCount} old records, kept ${Object.keys(cleanedRecords).length} records`);

      return {
        removedCount,
        totalRecords: Object.keys(cleanedRecords).length
      };
    } catch (error) {
      console.error('Error performing cleanup:', error);
      return {
        removedCount: 0,
        totalRecords: 0
      };
    }
  }

  /**
   * Get statistics about toast tracking
   */
  static async getStats(): Promise<{
    totalDomains: number;
    totalToastsShown: number;
    domainsShownToday: number;
    lastCleanup: number;
  }> {
    try {
      const data = await this.getTrackingData();
      const today = this.getTodayDateString();

      const totalDomains = Object.keys(data.records).length;
      const totalToastsShown = Object.values(data.records).reduce(
        (sum, record) => sum + record.showCount, 0
      );
      const domainsShownToday = Object.values(data.records).filter(
        record => record.lastShownDate === today
      ).length;

      return {
        totalDomains,
        totalToastsShown,
        domainsShownToday,
        lastCleanup: data.lastCleanup
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalDomains: 0,
        totalToastsShown: 0,
        domainsShownToday: 0,
        lastCleanup: Date.now()
      };
    }
  }

  /**
   * Reset all toast records (for testing purposes)
   */
  static async resetAll(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.STORAGE_KEY);
      console.log('Toast tracker: All records reset');
    } catch (error) {
      console.error('Error resetting toast tracker:', error);
    }
  }

  /**
   * Reset toast record for a specific domain (for testing purposes)
   */
  static async resetDomain(domain: string): Promise<void> {
    try {
      const data = await this.getTrackingData();
      delete data.records[domain];
      await this.saveTrackingData(data);
      console.log(`Toast tracker: Reset record for domain ${domain}`);
    } catch (error) {
      console.error(`Error resetting domain ${domain}:`, error);
    }
  }
}

export { DailyToastTracker }; 