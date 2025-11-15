import { Card, DomainSettings, Tag } from '../types/index';
import { GlobalSettings, ConflictStrategy } from '../types/storage';

/**
 * Represents a conflict found during import
 */
export interface DataConflict {
  type: 'card' | 'tag' | 'domain' | 'settings';
  id: string;
  existing: any;
  incoming: any;
  conflictReason: 'duplicate_id' | 'duplicate_content' | 'name_collision';
  contentHash?: string;
}

/**
 * Resolution decision for a conflict
 */
export interface ConflictResolution {
  conflictId: string;
  action: ConflictStrategy;
  newId?: string; // Used when action is 'rename'
  customData?: any; // Additional data for complex resolutions
}

/**
 * Summary of conflict detection results
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: DataConflict[];
  totalItems: number;
  conflictCount: number;
}

/**
 * ConflictResolver handles conflict detection and resolution during data import
 */
export class ConflictResolver {
  
  /**
   * Detect conflicts between incoming and existing cards
   */
  static detectCardConflicts(
    incomingCards: Record<string, Card>,
    existingCards: Record<string, Card>
  ): DataConflict[] {
    const conflicts: DataConflict[] = [];
    
    // Create content hash map for existing cards
    const existingContentHashes = new Map<string, string>();
    for (const [id, card] of Object.entries(existingCards)) {
      const contentHash = this.generateCardContentHash(card);
      existingContentHashes.set(contentHash, id);
    }
    
    for (const [incomingId, incomingCard] of Object.entries(incomingCards)) {
      // Check for ID conflicts
      if (existingCards[incomingId]) {
        conflicts.push({
          type: 'card',
          id: incomingId,
          existing: existingCards[incomingId],
          incoming: incomingCard,
          conflictReason: 'duplicate_id'
        });
        continue;
      }
      
      // Check for content conflicts (same front/back content)
      const incomingContentHash = this.generateCardContentHash(incomingCard);
      const existingIdWithSameContent = existingContentHashes.get(incomingContentHash);
      
      if (existingIdWithSameContent) {
        conflicts.push({
          type: 'card',
          id: incomingId,
          existing: existingCards[existingIdWithSameContent],
          incoming: incomingCard,
          conflictReason: 'duplicate_content',
          contentHash: incomingContentHash
        });
      }
    }
    
    return conflicts;
  }
  
  /**
   * Detect conflicts between incoming and existing tags
   */
  static detectTagConflicts(
    incomingTags: Record<string, Tag>,
    existingTags: Record<string, Tag>
  ): DataConflict[] {
    const conflicts: DataConflict[] = [];
    
    // Create name-to-id map for existing tags
    const existingTagNames = new Map<string, string>();
    for (const [id, tag] of Object.entries(existingTags)) {
      existingTagNames.set(tag.name.toLowerCase(), id);
    }
    
    for (const [incomingId, incomingTag] of Object.entries(incomingTags)) {
      // Check for ID conflicts
      if (existingTags[incomingId]) {
        conflicts.push({
          type: 'tag',
          id: incomingId,
          existing: existingTags[incomingId],
          incoming: incomingTag,
          conflictReason: 'duplicate_id'
        });
        continue;
      }
      
      // Check for name conflicts
      const existingIdWithSameName = existingTagNames.get(incomingTag.name.toLowerCase());
      if (existingIdWithSameName) {
        conflicts.push({
          type: 'tag',
          id: incomingId,
          existing: existingTags[existingIdWithSameName],
          incoming: incomingTag,
          conflictReason: 'name_collision'
        });
      }
    }
    
    return conflicts;
  }
  
  /**
   * Detect conflicts between incoming and existing domain settings
   */
  static detectDomainConflicts(
    incomingDomains: Record<string, DomainSettings>,
    existingDomains: Record<string, DomainSettings>
  ): DataConflict[] {
    const conflicts: DataConflict[] = [];
    
    for (const [domain, incomingSettings] of Object.entries(incomingDomains)) {
      if (existingDomains[domain]) {
        conflicts.push({
          type: 'domain',
          id: domain,
          existing: existingDomains[domain],
          incoming: incomingSettings,
          conflictReason: 'duplicate_id' // Domain name is the ID
        });
      }
    }
    
    return conflicts;
  }
  
  /**
   * Detect settings conflicts
   */
  static detectSettingsConflicts(
    incomingSettings: GlobalSettings,
    existingSettings: GlobalSettings
  ): DataConflict[] {
    // Settings don't typically have conflicts since there's only one global config
    // However, we might want to warn about significant differences
    const conflicts: DataConflict[] = [];
    
    // For now, we'll always flag settings as a potential conflict
    // to give users the choice to update or keep current settings
    conflicts.push({
      type: 'settings',
      id: 'global',
      existing: existingSettings,
      incoming: incomingSettings,
      conflictReason: 'duplicate_id'
    });
    
    return conflicts;
  }
  
  /**
   * Comprehensive conflict detection for all data types
   */
  static detectAllConflicts(
    incomingData: {
      cards?: Record<string, Card>;
      tags?: Record<string, Tag>;
      domains?: Record<string, DomainSettings>;
      globalSettings?: GlobalSettings;
    },
    existingData: {
      cards?: Record<string, Card>;
      tags?: Record<string, Tag>;
      domains?: Record<string, DomainSettings>;
      globalSettings?: GlobalSettings;
    }
  ): ConflictDetectionResult {
    const allConflicts: DataConflict[] = [];
    let totalItems = 0;
    
    // Check card conflicts
    if (incomingData.cards && existingData.cards) {
      const cardConflicts = this.detectCardConflicts(
        incomingData.cards,
        existingData.cards
      );
      allConflicts.push(...cardConflicts);
      totalItems += Object.keys(incomingData.cards).length;
    }
    
    // Check tag conflicts
    if (incomingData.tags && existingData.tags) {
      const tagConflicts = this.detectTagConflicts(
        incomingData.tags,
        existingData.tags
      );
      allConflicts.push(...tagConflicts);
      totalItems += Object.keys(incomingData.tags).length;
    }
    
    // Check domain conflicts
    if (incomingData.domains && existingData.domains) {
      const domainConflicts = this.detectDomainConflicts(
        incomingData.domains,
        existingData.domains
      );
      allConflicts.push(...domainConflicts);
      totalItems += Object.keys(incomingData.domains).length;
    }
    
    // Check settings conflicts
    if (incomingData.globalSettings && existingData.globalSettings) {
      const settingsConflicts = this.detectSettingsConflicts(
        incomingData.globalSettings,
        existingData.globalSettings
      );
      allConflicts.push(...settingsConflicts);
      totalItems += 1;
    }
    
    return {
      hasConflicts: allConflicts.length > 0,
      conflicts: allConflicts,
      totalItems,
      conflictCount: allConflicts.length
    };
  }
  
  /**
   * Apply conflict resolutions to incoming data
   */
  static applyConflictResolutions(
    incomingData: {
      cards?: Record<string, Card>;
      tags?: Record<string, Tag>;
      domains?: Record<string, DomainSettings>;
      globalSettings?: GlobalSettings;
    },
    resolutions: ConflictResolution[]
  ): {
    processedData: typeof incomingData;
    skippedItems: string[];
    renamedItems: Array<{ oldId: string; newId: string; type: string }>;
  } {
    const processedData = JSON.parse(JSON.stringify(incomingData)); // Deep clone
    const skippedItems: string[] = [];
    const renamedItems: Array<{ oldId: string; newId: string; type: string }> = [];
    
    for (const resolution of resolutions) {
      const conflict = this.findConflictById(resolution.conflictId, []);
      if (!conflict) continue;
      
      switch (resolution.action) {
        case 'skip':
          this.removeItemFromProcessedData(processedData, conflict);
          skippedItems.push(conflict.id);
          break;
          
        case 'rename':
          if (resolution.newId) {
            this.renameItemInProcessedData(processedData, conflict, resolution.newId);
            renamedItems.push({
              oldId: conflict.id,
              newId: resolution.newId,
              type: conflict.type
            });
          }
          break;
          
        case 'overwrite':
          // Keep the incoming data as-is (default behavior)
          break;
      }
    }
    
    return {
      processedData,
      skippedItems,
      renamedItems
    };
  }
  
  /**
   * Generate a content hash for a card to detect duplicates
   */
  private static generateCardContentHash(card: Card): string {
    const content = `${card.front}|${card.back}|${card.type}`;
    return this.simpleHash(content);
  }
  
  /**
   * Simple hash function for content comparison
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  
  /**
   * Find a conflict by its ID
   */
  private static findConflictById(conflictId: string, conflicts: DataConflict[]): DataConflict | null {
    return conflicts.find(c => c.id === conflictId) || null;
  }
  
  /**
   * Remove an item from processed data based on conflict
   */
  private static removeItemFromProcessedData(
    processedData: any,
    conflict: DataConflict
  ): void {
    switch (conflict.type) {
      case 'card':
        if (processedData.cards && processedData.cards[conflict.id]) {
          delete processedData.cards[conflict.id];
        }
        break;
      case 'tag':
        if (processedData.tags && processedData.tags[conflict.id]) {
          delete processedData.tags[conflict.id];
        }
        break;
      case 'domain':
        if (processedData.domains && processedData.domains[conflict.id]) {
          delete processedData.domains[conflict.id];
        }
        break;
      case 'settings':
        if (processedData.globalSettings) {
          delete processedData.globalSettings;
        }
        break;
    }
  }
  
  /**
   * Rename an item in processed data
   */
  private static renameItemInProcessedData(
    processedData: any,
    conflict: DataConflict,
    newId: string
  ): void {
    switch (conflict.type) {
      case 'card':
        if (processedData.cards && processedData.cards[conflict.id]) {
          const card = processedData.cards[conflict.id];
          card.id = newId;
          processedData.cards[newId] = card;
          delete processedData.cards[conflict.id];
        }
        break;
      case 'tag':
        if (processedData.tags && processedData.tags[conflict.id]) {
          const tag = processedData.tags[conflict.id];
          tag.id = newId;
          processedData.tags[newId] = tag;
          delete processedData.tags[conflict.id];
        }
        break;
      case 'domain':
        // Domain renaming is more complex since domain name is the key
        // For now, we'll treat it as overwrite
        break;
    }
  }
  
  /**
   * Generate a unique ID for renaming conflicts
   */
  static generateUniqueId(
    baseId: string,
    existingIds: Set<string>,
    type: 'card' | 'tag' | 'domain'
  ): string {
    let counter = 1;
    let newId: string;
    
    do {
      switch (type) {
        case 'card':
          newId = `${baseId}_imported_${counter}`;
          break;
        case 'tag':
          newId = `${baseId}_${counter}`;
          break;
        case 'domain':
          newId = `${baseId}-${counter}`;
          break;
        default:
          newId = `${baseId}_${counter}`;
      }
      counter++;
    } while (existingIds.has(newId));
    
    return newId;
  }
  
  /**
   * Get a human-readable description of a conflict
   */
  static getConflictDescription(conflict: DataConflict): string {
    const typeNames = {
      card: 'Card',
      tag: 'Tag',
      domain: 'Domain',
      settings: 'Settings'
    };
    
    const reasonDescriptions = {
      duplicate_id: 'has the same ID as an existing item',
      duplicate_content: 'has the same content as an existing item',
      name_collision: 'has the same name as an existing item'
    };
    
    const typeName = typeNames[conflict.type];
    const reasonDesc = reasonDescriptions[conflict.conflictReason];
    
    return `${typeName} "${conflict.id}" ${reasonDesc}`;
  }
  
  /**
   * Get suggested resolution for a conflict
   */
  static getSuggestedResolution(conflict: DataConflict): ConflictStrategy {
    switch (conflict.conflictReason) {
      case 'duplicate_content':
        return 'skip'; // Skip identical content
      case 'duplicate_id':
        return 'rename'; // Rename to avoid ID collision
      case 'name_collision':
        return 'rename'; // Rename to avoid name collision
      default:
        return 'overwrite';
    }
  }
} 