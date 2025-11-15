/**
 * Text normalization utilities for answer matching
 */

export interface NormalizationOptions {
  caseSensitive?: boolean;
  preserveWhitespace?: boolean;
  preservePunctuation?: boolean;
}

/**
 * Normalize text for answer comparison
 */
export function normalizeText(text: string, options: NormalizationOptions = {}): string {
  if (!text) return '';

  let normalized = text;

  // Trim whitespace (unless preserveWhitespace is true)
  if (!options.preserveWhitespace) {
    normalized = normalized.trim();
  }

  // Collapse multiple whitespace to single space (unless preserveWhitespace is true)
  if (!options.preserveWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ');
  }

  // Convert to lowercase (unless caseSensitive is true)
  if (!options.caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  // Remove punctuation (unless preservePunctuation is true)
  if (!options.preservePunctuation) {
    // Remove common punctuation but keep apostrophes that are part of words
    normalized = normalized.replace(/[^\w\s']/g, '');
    // Remove standalone apostrophes or those at start/end of words
    normalized = normalized.replace(/(?:^'|'$|\s'|\s)/g, ' ');
    // Clean up any extra spaces created (unless preserveWhitespace is true)
    if (!options.preserveWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }
  }

  return normalized;
}

/**
 * Check if user answer matches any of the acceptable answers
 */
export function checkAnswerMatch(
  userAnswer: string,
  correctAnswer: string,
  acceptableAnswers: string[] = [],
  strictMatching: boolean = false
): { 
  isMatch: boolean; 
  matchedAnswer?: string; 
  normalizedUserAnswer: string;
  normalizedCorrectAnswer: string;
  normalizedAcceptableAnswers: string[];
} {
  const normalizationOptions: NormalizationOptions = {
    caseSensitive: strictMatching,
    preserveWhitespace: strictMatching,
    preservePunctuation: strictMatching
  };

  const normalizedUserAnswer = normalizeText(userAnswer, normalizationOptions);
  const normalizedCorrectAnswer = normalizeText(correctAnswer, normalizationOptions);
  const normalizedAcceptableAnswers = acceptableAnswers.map(answer => 
    normalizeText(answer, normalizationOptions)
  );

  // Check exact match with correct answer
  if (normalizedUserAnswer === normalizedCorrectAnswer) {
    return {
      isMatch: true,
      matchedAnswer: correctAnswer,
      normalizedUserAnswer,
      normalizedCorrectAnswer,
      normalizedAcceptableAnswers
    };
  }

  // Check exact match with any acceptable answer
  for (let i = 0; i < normalizedAcceptableAnswers.length; i++) {
    if (normalizedUserAnswer === normalizedAcceptableAnswers[i]) {
      return {
        isMatch: true,
        matchedAnswer: acceptableAnswers[i],
        normalizedUserAnswer,
        normalizedCorrectAnswer,
        normalizedAcceptableAnswers
      };
    }
  }

  // If not strict matching, try partial matching (but not with empty strings)
  if (!strictMatching && normalizedUserAnswer && normalizedCorrectAnswer) {
    // Check if correct answer contains user answer or vice versa
    if (normalizedCorrectAnswer.includes(normalizedUserAnswer) || 
        normalizedUserAnswer.includes(normalizedCorrectAnswer)) {
      return {
        isMatch: true,
        matchedAnswer: correctAnswer,
        normalizedUserAnswer,
        normalizedCorrectAnswer,
        normalizedAcceptableAnswers
      };
    }

    // Check partial matching with acceptable answers
    for (let i = 0; i < normalizedAcceptableAnswers.length; i++) {
      const normalizedAcceptable = normalizedAcceptableAnswers[i];
      if (normalizedAcceptable && normalizedUserAnswer &&
          (normalizedAcceptable.includes(normalizedUserAnswer) || 
           normalizedUserAnswer.includes(normalizedAcceptable))) {
        return {
          isMatch: true,
          matchedAnswer: acceptableAnswers[i],
          normalizedUserAnswer,
          normalizedCorrectAnswer,
          normalizedAcceptableAnswers
        };
      }
    }
  }

  return {
    isMatch: false,
    normalizedUserAnswer,
    normalizedCorrectAnswer,
    normalizedAcceptableAnswers
  };
}

/**
 * Parse comma or newline delimited acceptable answers
 */
export function parseAcceptableAnswers(input: string): string[] {
  if (!input.trim()) return [];
  
  // Split by comma or newline, then clean up each answer
  return input
    .split(/[,\n]/)
    .map(answer => answer.trim())
    .filter(answer => answer.length > 0);
}

/**
 * Format acceptable answers for display in UI
 */
export function formatAcceptableAnswers(answers: string[]): string {
  return answers.join(', ');
}
