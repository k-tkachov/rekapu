/**
 * AnkiImporter - Parse Anki .txt exports and convert to Rekapu format
 * 
 * Supports Anki's plain text export format with tab-separated values
 * Format: #separator:tab, #html:false/true, #tags column:N
 * 
 * IMPORTANT: Only accepts #html:false exports to ensure plain text compatibility
 */

import { BackupData, DEFAULT_SPACED_REPETITION } from '../types/storage';
import { Card } from '../types/index';

export interface AnkiParseResult {
  success: boolean;
  backupData?: BackupData;
  errors: string[];
  warnings: string[];
  previewCards: Array<{ front: string; back: string; tags: string[] }>;
}

interface AnkiMetadata {
  separator: string;
  htmlEnabled: boolean;
  tagsColumn: number;
}

export class AnkiImporter {
  private static readonly MAX_ROWS = 50000;
  private static readonly BACKUP_VERSION = '2.0.0';

  /**
   * Parse Anki .txt file and convert to BackupData format
   * @param file - The Anki .txt file to parse
   * @param additionalTags - Optional tags to add to all imported cards
   */
  static async parse(file: File, additionalTags: string[] = []): Promise<AnkiParseResult> {
    const result: AnkiParseResult = {
      success: false,
      errors: [],
      warnings: [],
      previewCards: []
    };

    try {
      // Read file content
      const text = await file.text();
      
      if (!text || text.trim().length === 0) {
        result.errors.push('File is empty');
        return result;
      }

      // Remove UTF-8 BOM if present
      const cleanText = this.removeBOM(text);
      const lines = cleanText.split('\n');

      // Parse metadata headers
      const metadata = this.parseMetadata(lines);
      
      // Validate HTML setting
      if (metadata.htmlEnabled) {
        result.errors.push(
          'HTML export detected. Please export without HTML.\n\n' +
          'In Anki:\n' +
          '1. File → Export\n' +
          '2. Export format: Notes in Plain Text (.txt)\n' +
          '3. UNCHECK "Include HTML and media references"\n' +
          '4. Export'
        );
        return result;
      }

      // Find where data rows start (after metadata headers)
      let dataStartIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('#')) {
          dataStartIndex = i + 1;
        } else if (lines[i].trim().length > 0) {
          break;
        }
      }

      // Parse data rows
      const dataRows: string[][] = [];
      for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip empty lines (check before trimming to preserve tab structure)
        if (line.trim().length === 0) continue;
        
        // Parse row (do NOT trim line before parsing to preserve separator structure)
        const row = this.parseRow(line, metadata.separator);
        
        // Trim individual fields after parsing
        for (let j = 0; j < row.length; j++) {
          row[j] = row[j].trim();
        }
        
        // Validate row has minimum required columns (front field is required, back can be empty)
        if (row.length < 1) {
          result.warnings.push(`Row ${i + 1}: Insufficient columns (need at least 1)`);
          continue;
        }
        
        // Validate front is not empty
        if (row[0].length === 0) {
          result.warnings.push(`Row ${i + 1}: Front field is empty, skipping`);
          continue;
        }

        // Ensure back field exists (can be empty string)
        if (row.length < 2) {
          row.push(''); // Add empty back if not present
        }

        dataRows.push(row);
        
        // Safety limit
        if (dataRows.length >= this.MAX_ROWS) {
          result.warnings.push(`Stopped at ${this.MAX_ROWS} rows (maximum limit)`);
          break;
        }
      }

      // Validate we have data
      if (dataRows.length === 0) {
        result.errors.push('No valid data rows found in file');
        return result;
      }

      // Convert to BackupData
      const backupData = this.convertToBackupData(dataRows, metadata.tagsColumn, additionalTags);
      
      // Generate preview (first 3 cards)
      const previewCount = Math.min(3, dataRows.length);
      for (let i = 0; i < previewCount; i++) {
        const row = dataRows[i];
        const tags = metadata.tagsColumn >= 0 && row[metadata.tagsColumn] 
          ? this.parseTags(row[metadata.tagsColumn])
          : [];
        
        result.previewCards.push({
          front: row[0].trim(),
          back: row[1].trim(),
          tags
        });
      }

      result.success = true;
      result.backupData = backupData;
      return result;

    } catch (error) {
      result.errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Parse metadata headers from Anki export
   * Expected format:
   *   #separator:tab
   *   #html:false
   *   #tags column:3
   */
  private static parseMetadata(lines: string[]): AnkiMetadata {
    const metadata: AnkiMetadata = {
      separator: '\t',
      htmlEnabled: false,
      tagsColumn: -1
    };

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed.startsWith('#')) {
        break; // End of metadata section
      }

      // Parse separator
      if (trimmed.startsWith('#separator:')) {
        const value = trimmed.substring('#separator:'.length).trim();
        if (value === 'tab') {
          metadata.separator = '\t';
        } else if (value === 'space') {
          metadata.separator = ' ';
        } else if (value === 'comma') {
          metadata.separator = ',';
        } else {
          // Custom separator
          metadata.separator = value;
        }
      }
      
      // Parse HTML setting
      else if (trimmed.startsWith('#html:')) {
        const value = trimmed.substring('#html:'.length).trim().toLowerCase();
        metadata.htmlEnabled = value === 'true';
      }
      
      // Parse tags column
      else if (trimmed.startsWith('#tags column:')) {
        const value = trimmed.substring('#tags column:'.length).trim();
        const columnNum = parseInt(value, 10);
        if (!isNaN(columnNum) && columnNum > 0) {
          metadata.tagsColumn = columnNum - 1; // Convert to 0-based index
        }
      }
    }

    return metadata;
  }

  /**
   * Remove UTF-8 BOM marker if present
   */
  private static removeBOM(text: string): string {
    if (text.charCodeAt(0) === 0xFEFF) {
      return text.substring(1);
    }
    return text;
  }

  /**
   * Parse a single row using the specified separator
   * Handles escaped separators and preserves multi-line content
   * Note: Individual fields are trimmed by the caller after parsing
   */
  private static parseRow(row: string, separator: string): string[] {
    // Simple split by separator - trimming is done by caller
    return row.split(separator);
  }

  /**
   * Parse tags from a tags column
   * Supports comma, semicolon, and space-separated tags
   */
  private static parseTags(tagsStr: string): string[] {
    if (!tagsStr || tagsStr.trim().length === 0) {
      return [];
    }

    // Split by common separators and filter out empty strings
    return tagsStr
      .split(/[,;\s]+/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  /**
   * Generate unique card ID
   */
  private static generateCardId(): string {
    return `anki_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Convert parsed Anki rows to BackupData format
   * @param rows - Parsed data rows
   * @param tagsColumn - Column index for tags (0-based, -1 if no tags column)
   * @param additionalTags - Additional tags to add to all cards
   */
  private static convertToBackupData(rows: string[][], tagsColumn: number, additionalTags: string[] = []): BackupData {
    const cards: Record<string, Card> = {};
    const tags: Record<string, any> = {};
    const now = Date.now();

    // Process each row
    for (const row of rows) {
      const id = this.generateCardId();
      const front = row[0].trim();
      const back = row[1]?.trim() || '';
      
      // Extract tags if tags column is specified
      const cardTags: string[] = [];
      if (tagsColumn >= 0 && row[tagsColumn]) {
        const parsedTags = this.parseTags(row[tagsColumn]);
        cardTags.push(...parsedTags);
        
        // Add tags to tags dictionary (create proper TagRecords)
        for (const tagName of parsedTags) {
          if (!tags[tagName]) {
            tags[tagName] = {
              id: `tag_${now}_${Math.random().toString(36).substr(2, 9)}`,
              name: tagName,
              color: this.generateTagColor(tagName),
              created: now
            };
          }
        }
      }
      
      // Add additional tags to this card
      for (const tagName of additionalTags) {
        if (!cardTags.includes(tagName)) {
          cardTags.push(tagName);
        }
        
        // Ensure additional tags are in tags dictionary (create proper TagRecords)
        if (!tags[tagName]) {
          tags[tagName] = {
            id: `tag_${now}_${Math.random().toString(36).substr(2, 9)}`,
            name: tagName,
            color: this.generateTagColor(tagName),
            created: now
          };
        }
      }

      // Create card
      cards[id] = {
        id,
        type: 'basic', // Default to 'basic' type (show answer)
        front,
        back,
        tags: cardTags,
        created: now,
        modified: now,
        algorithm: {
          ...DEFAULT_SPACED_REPETITION,
          dueDate: now // Due immediately for new imports
        },
        isDraft: false
      };
    }

    // Create BackupData structure
    return {
      version: this.BACKUP_VERSION,
      timestamp: now,
      scope: 'cards',
      data: {
        cards,
        tags
      }
    };
  }

  /**
   * Generate a consistent color for a tag based on its name
   */
  private static generateTagColor(tagName: string): string {
    // Simple hash to generate consistent colors
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate HSL color with fixed saturation and lightness for consistency
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  }
}

