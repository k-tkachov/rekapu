/**
 * Cloze deletion parser for Rekapu
 * Supports Anki-style cloze deletions: {{cN::text::hint}}
 */

export interface ClozeDeletion {
  id: number; // c1, c2, etc.
  text: string; // The text to be hidden
  hint?: string; // Optional hint
  startIndex: number; // Position in original text
  endIndex: number; // End position in original text
}

export interface ClozeParseResult {
  hasClozeDeletions: boolean;
  deletions: ClozeDeletion[];
  cleanText: string; // Text with all cloze markers removed
  errors: string[];
}

/**
 * Parse cloze deletions from text
 * Supports formats:
 * - {{c1::Paris}} - Simple deletion
 * - {{c1::Paris::capital of France}} - Deletion with hint
 */
export function parseClozeText(text: string): ClozeParseResult {
  const result: ClozeParseResult = {
    hasClozeDeletions: false,
    deletions: [],
    cleanText: text,
    errors: []
  };

  // Regex to match cloze deletions: {{cN::text}} or {{cN::text::hint}}
  const clozeRegex = /\{\{c(\d+)::([^:}]+)(?:::([^}]*))?\}\}/g;
  
  let match;
  let offset = 0;
  const deletionMap = new Map<number, ClozeDeletion>();
  
  while ((match = clozeRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const clozeId = parseInt(match[1], 10);
    const clozeText = match[2].trim();
    const clozeHint = match[3]?.trim();
    
    // Validate cloze ID
    if (clozeId < 1 || clozeId > 20) {
      result.errors.push(`Invalid cloze ID: c${clozeId}. Must be between c1 and c20.`);
      continue;
    }
    
    // Validate cloze text
    if (!clozeText) {
      result.errors.push(`Empty cloze text for c${clozeId}`);
      continue;
    }
    
    // Check for duplicate cloze IDs
    if (deletionMap.has(clozeId)) {
      result.errors.push(`Duplicate cloze ID: c${clozeId}`);
      continue;
    }
    
    const deletion: ClozeDeletion = {
      id: clozeId,
      text: clozeText,
      hint: clozeHint || undefined,
      startIndex: match.index - offset,
      endIndex: match.index - offset + clozeText.length
    };
    
    deletionMap.set(clozeId, deletion);
    
    // Update offset for next iteration
    offset += fullMatch.length - clozeText.length;
  }
  
  // Convert map to sorted array
  result.deletions = Array.from(deletionMap.values()).sort((a, b) => a.id - b.id);
  result.hasClozeDeletions = result.deletions.length > 0;
  
  // Generate clean text (remove all cloze markers, keep only the text)
  if (result.hasClozeDeletions) {
    result.cleanText = text.replace(clozeRegex, (match, id, text) => text.trim());
  }
  
  return result;
}

/**
 * Render cloze text with specific deletion masked
 * @param text Original text with cloze markers
 * @param maskDeletionId The cloze ID to mask (others will be shown)
 * @param placeholder Text to show in place of masked content
 */
export function renderClozeWithMask(
  text: string, 
  maskDeletionId: number, 
  placeholder: string = '[...]'
): string {
  const clozeRegex = /\{\{c(\d+)::([^:}]+)(?:::([^}]*))?\}\}/g;
  
  return text.replace(clozeRegex, (match, id, clozeText, hint) => {
    const clozeId = parseInt(id, 10);
    
    if (clozeId === maskDeletionId) {
      // This is the deletion to mask
      const hintText = hint?.trim();
      return hintText ? `${placeholder} (${hintText})` : placeholder;
    } else {
      // This deletion should be shown
      return clozeText.trim();
    }
  });
}

/**
 * Generate individual cloze cards from a cloze card
 */
export function generateClozeCards(cardId: string, text: string): Array<{
  id: string; // cardId::cN
  cardText: string; // Text with this deletion masked
  answer: string; // The text that was masked
  hint?: string;
  deletionId: number;
}> {
  const parseResult = parseClozeText(text);
  
  if (!parseResult.hasClozeDeletions) {
    return [];
  }
  
  return parseResult.deletions.map(deletion => ({
    id: `${cardId}::c${deletion.id}`,
    cardText: renderClozeWithMask(text, deletion.id),
    answer: deletion.text,
    hint: deletion.hint,
    deletionId: deletion.id
  }));
}

/**
 * Validate cloze text and return any issues
 */
export function validateClozeText(text: string): { isValid: boolean; errors: string[] } {
  const parseResult = parseClozeText(text);
  
  return {
    isValid: parseResult.errors.length === 0 && parseResult.hasClozeDeletions,
    errors: parseResult.errors
  };
}
