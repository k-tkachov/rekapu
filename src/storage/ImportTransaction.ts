/**
 * ImportTransaction - Provides atomic import operations with rollback capability
 * Ensures data integrity during import operations by creating snapshots and allowing rollback
 */

import { StorageManager } from './StorageManager';
import { indexedDBManager } from './IndexedDBManager';
import { SnapshotRecord } from './IndexedDBSchema';
import { Card, Tag, DomainSettings } from '../types/index';
import { GlobalSettings, ImportReport } from '../types/storage';

export interface DataSnapshot {
  id: string;
  timestamp: number;
  cards: Record<string, Card>;
  tags: Record<string, Tag>;
  domains: Record<string, DomainSettings>;
  globalSettings: GlobalSettings;
  statisticsData?: any; // Will include statistics when needed
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TransactionResult {
  success: boolean;
  snapshotId?: string;
  importReport?: ImportReport;
  error?: string;
  rollbackPerformed?: boolean;
}

export class ImportTransaction {
  private snapshotId: string;
  private snapshot: DataSnapshot | null = null;
  private isTransactionActive = false;

  constructor() {
    this.snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute an atomic import operation with rollback capability
   */
  async execute<T>(
    operation: () => Promise<T>,
    validateAfter: boolean = true
  ): Promise<{ result: T; snapshotId: string }> {
    if (this.isTransactionActive) {
      throw new Error('Transaction already active');
    }

    try {
      this.isTransactionActive = true;
      
      // Create snapshot before operation
      await this.createSnapshot();
      
      // Execute the operation
      const result = await operation();
      
      // Validate data integrity after operation if requested
      if (validateAfter) {
        const validation = await this.validateDataIntegrity();
        if (!validation.isValid) {
          // Rollback on validation failure
          await this.rollback();
          throw new Error(`Data validation failed after import: ${validation.errors.join(', ')}`);
        }
      }
      
      // Operation successful - keep snapshot for potential manual rollback
      await this.persistSnapshot();
      
      return { result, snapshotId: this.snapshotId };
      
    } catch (error) {
      // Rollback on any error
      if (this.snapshot) {
        await this.rollback();
      }
      throw error;
    } finally {
      this.isTransactionActive = false;
    }
  }

  /**
   * Create a complete snapshot of current data state
   */
  private async createSnapshot(): Promise<void> {
    try {
      const [cardsResult, tagsResult, domainsResult, settingsResult] = await Promise.all([
        StorageManager.getAllCards(),
        StorageManager.getAllTags(),
        StorageManager.getAllDomains(),
        StorageManager.getGlobalSettings()
      ]);

      if (!cardsResult.success) {
        throw new Error(`Failed to snapshot cards: ${cardsResult.error}`);
      }
      if (!tagsResult.success) {
        throw new Error(`Failed to snapshot tags: ${tagsResult.error}`);
      }
      if (!domainsResult.success) {
        throw new Error(`Failed to snapshot domains: ${domainsResult.error}`);
      }
      if (!settingsResult.success) {
        throw new Error(`Failed to snapshot settings: ${settingsResult.error}`);
      }

      this.snapshot = {
        id: this.snapshotId,
        timestamp: Date.now(),
        cards: cardsResult.data || {},
        tags: tagsResult.data || {},
        domains: domainsResult.data || {},
        globalSettings: settingsResult.data!,
      };

    } catch (error) {
      throw new Error(`Failed to create snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Persist snapshot to storage for later recovery
   */
  private async persistSnapshot(): Promise<void> {
    if (!this.snapshot) {
      return;
    }

    try {
      // Store snapshot in IndexedDB
      const snapshotRecord: SnapshotRecord = {
        id: this.snapshotId,
        timestamp: this.snapshot.timestamp,
        cards: this.snapshot.cards,
        tags: this.snapshot.tags,
        domains: this.snapshot.domains,
        globalSettings: this.snapshot.globalSettings,
        statisticsData: this.snapshot.statisticsData
      };

      const result = await indexedDBManager.setSnapshot(snapshotRecord);
      if (!result.success) {
        throw new Error(`Failed to store snapshot: ${result.error}`);
      }

      // Keep only the last 5 snapshots to prevent storage bloat
      await this.cleanupOldSnapshots();

    } catch (error) {
      console.warn('Failed to persist snapshot for recovery:', error);
      // Don't fail the transaction for snapshot persistence issues
    }
  }

  /**
   * Rollback to the snapshot state
   */
  async rollback(): Promise<void> {
    if (!this.snapshot) {
      throw new Error('No snapshot available for rollback');
    }

    try {
      // Clear all current data first
      await this.clearCurrentData();

      // Restore from snapshot
      await this.restoreFromSnapshot(this.snapshot);

    } catch (error) {
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate data integrity after operations
   */
  private async validateDataIntegrity(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get current data state
      const [cardsResult, tagsResult] = await Promise.all([
        StorageManager.getAllCards(),
        StorageManager.getAllTags()
      ]);

      if (!cardsResult.success || !tagsResult.success) {
        errors.push('Failed to load data for validation');
        return { isValid: false, errors, warnings };
      }

      const cards = cardsResult.data || {};
      const tags = tagsResult.data || {};
      const tagIds = new Set(Object.keys(tags));

      // Validate card integrity
      for (const [cardId, card] of Object.entries(cards)) {
        // Check required fields
        if (!card.front || !card.back) {
          errors.push(`Card ${cardId} missing required front/back content`);
        }

        // Check algorithm data
        if (!card.algorithm || typeof card.algorithm.dueDate !== 'number') {
          errors.push(`Card ${cardId} has invalid algorithm data`);
        }

        // Check tag references
        for (const tagName of card.tags || []) {
          const matchingTag = Object.values(tags).find(tag => tag.name === tagName);
          if (!matchingTag) {
            warnings.push(`Card ${cardId} references unknown tag: ${tagName}`);
          }
        }

        // Check timestamps
        if (!card.created || !card.modified) {
          warnings.push(`Card ${cardId} missing timestamp data`);
        }
      }

      // Validate tag integrity
      for (const [tagId, tag] of Object.entries(tags)) {
        if (!tag.name || !tag.color) {
          errors.push(`Tag ${tagId} missing required name/color`);
        }
      }

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Clear all current data (for rollback)
   */
  private async clearCurrentData(): Promise<void> {
    // Clear cards
    const cardsResult = await StorageManager.getAllCards();
    if (cardsResult.success && cardsResult.data) {
      for (const cardId of Object.keys(cardsResult.data)) {
        await StorageManager.removeCard(cardId);
      }
    }

    // Clear tags
    const tagsResult = await StorageManager.getAllTags();
    if (tagsResult.success && tagsResult.data) {
      for (const tagId of Object.keys(tagsResult.data)) {
        await StorageManager.removeTag(tagId);
      }
    }

    // Clear domains
    const domainsResult = await StorageManager.getAllDomains();
    if (domainsResult.success && domainsResult.data) {
      for (const domain of Object.keys(domainsResult.data)) {
        await StorageManager.removeDomain(domain);
      }
    }
  }

  /**
   * Restore data from snapshot
   */
  private async restoreFromSnapshot(snapshot: DataSnapshot): Promise<void> {
    // Restore cards
    for (const [cardId, card] of Object.entries(snapshot.cards)) {
      const result = await indexedDBManager.setCard(card);
      if (!result.success) {
        throw new Error(`Failed to restore card ${cardId}: ${result.error}`);
      }
    }

    // Restore tags
    for (const [tagId, tag] of Object.entries(snapshot.tags)) {
      const result = await indexedDBManager.setTag(tag);
      if (!result.success) {
        throw new Error(`Failed to restore tag ${tagId}: ${result.error}`);
      }
    }

    // Restore domains
    for (const [domain, domainSettings] of Object.entries(snapshot.domains)) {
      const result = await StorageManager.setDomain(domain, domainSettings);
      if (!result.success) {
        throw new Error(`Failed to restore domain ${domain}: ${result.error}`);
      }
    }

    // Restore global settings
    const settingsResult = await StorageManager.updateGlobalSettings(snapshot.globalSettings);
    if (!settingsResult.success) {
      throw new Error(`Failed to restore global settings: ${settingsResult.error}`);
    }
  }

  /**
   * Clean up old snapshots to prevent storage bloat
   */
  private async cleanupOldSnapshots(): Promise<void> {
    try {
      const result = await indexedDBManager.cleanupOldSnapshots(5);
      if (!result.success) {
        console.warn('Failed to cleanup old snapshots:', result.error);
      }
    } catch (error) {
      console.warn('Failed to cleanup old snapshots:', error);
    }
  }

  /**
   * Get list of available snapshots for manual recovery
   */
  static async getAvailableSnapshots(): Promise<DataSnapshot[]> {
    try {
      const result = await indexedDBManager.getSnapshots();
      if (!result.success) {
        console.error('Failed to get available snapshots:', result.error);
        return [];
      }

      const snapshots: DataSnapshot[] = [];
      for (const snapshotRecord of result.data || []) {
        try {
          const snapshot: DataSnapshot = {
            id: snapshotRecord.id,
            timestamp: snapshotRecord.timestamp,
            cards: snapshotRecord.cards,
            tags: snapshotRecord.tags,
            domains: snapshotRecord.domains,
            globalSettings: snapshotRecord.globalSettings,
            statisticsData: snapshotRecord.statisticsData
          };
          snapshots.push(snapshot);
        } catch (error) {
          console.warn(`Failed to parse snapshot ${snapshotRecord.id}:`, error);
        }
      }

      return snapshots;
    } catch (error) {
      console.error('Failed to get available snapshots:', error);
      return [];
    }
  }

  /**
   * Manually restore from a specific snapshot
   */
  static async restoreFromSnapshot(snapshotId: string): Promise<void> {
    try {
      const result = await indexedDBManager.getSnapshot(snapshotId);
      
      if (!result.success) {
        throw new Error(`Failed to get snapshot: ${result.error}`);
      }
      
      if (!result.data) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }

      const snapshotRecord = result.data;
      const snapshot: DataSnapshot = {
        id: snapshotRecord.id,
        timestamp: snapshotRecord.timestamp,
        cards: snapshotRecord.cards,
        tags: snapshotRecord.tags,
        domains: snapshotRecord.domains,
        globalSettings: snapshotRecord.globalSettings,
        statisticsData: snapshotRecord.statisticsData
      };
      
      const transaction = new ImportTransaction();
      
      // Create a backup before restore
      await transaction.createSnapshot();
      await transaction.persistSnapshot();
      
      // Perform restore
      await transaction.clearCurrentData();
      await transaction.restoreFromSnapshot(snapshot);

    } catch (error) {
      throw new Error(`Failed to restore from snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a specific snapshot
   */
  static async deleteSnapshot(snapshotId: string): Promise<void> {
    try {
      const result = await indexedDBManager.deleteSnapshot(snapshotId);
      if (!result.success) {
        throw new Error(`Failed to delete snapshot: ${result.error}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 