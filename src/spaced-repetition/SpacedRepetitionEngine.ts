/**
 * Spaced Repetition Engine for Rekapu Extension
 * Implements SuperMemo-2 algorithm for optimal learning intervals
 */

import { Card, Difficulty } from '../types/index';
import { isDueByEndOfToday } from '../utils/dateUtils';

export interface AlgorithmResult {
  interval: number;     // days until next review
  ease: number;         // ease factor (1.3+)
  repetitions: number;  // successful repetitions
  dueDate: number;      // timestamp when due
}

export class SpacedRepetitionEngine {
  // SuperMemo-2 constants
  private static readonly MIN_EASE = 1.3;
  private static readonly INITIAL_EASE = 2.5;
  private static readonly EASE_ADJUSTMENT = 0.15;
  private static readonly MIN_INTERVAL = 1; // minimum 1 day

  /**
   * Calculate next review parameters based on user feedback
   */
  static calculateNext(
    card: Card,
    difficulty: Difficulty
  ): AlgorithmResult {
    const { interval, ease, repetitions } = card.algorithm;
    
    switch (difficulty) {
      case 'again':
        return this.handleAgain();
      
      case 'hard':
        return this.handleHard(interval, ease, repetitions);
      
      case 'good':
        return this.handleGood(interval, ease, repetitions);
      
      case 'easy':
        return this.handleEasy(interval, ease, repetitions);
      
      default:
        throw new Error(`Unknown difficulty: ${difficulty}`);
    }
  }

  /**
   * Handle "Again" response - reset to learning phase (like Anki)
   */
  private static handleAgain(): AlgorithmResult {
    const interval = 1/1440; // 1 minute in days (1/1440)
    const dueDate = this.calculateDueDate(interval);
    
    return {
      interval,
      ease: this.INITIAL_EASE, // Reset ease to default
      repetitions: 0,
      dueDate
    };
  }

  /**
   * Handle "Hard" response - reduce ease and use conservative interval (like Anki)
   */
  private static handleHard(
    currentInterval: number,
    currentEase: number,
    repetitions: number
  ): AlgorithmResult {
    const newEase = Math.max(
      this.MIN_EASE,
      currentEase - this.EASE_ADJUSTMENT
    );
    
    let newInterval: number;
    if (repetitions === 0) {
      // Learning phase - 6 minutes
      newInterval = 6/1440; // 6 minutes in days
    } else if (repetitions === 1) {
      // Second learning step - half of good interval
      newInterval = 3; // 3 days
    } else {
      // Graduated - use conservative multiplier
      newInterval = Math.max(
        this.MIN_INTERVAL,
        Math.round(currentInterval * 1.2)
      );
    }
    
    const dueDate = this.calculateDueDate(newInterval);
    
    return {
      interval: newInterval,
      ease: newEase,
      repetitions: repetitions + 1,
      dueDate
    };
  }

  /**
   * Handle "Good" response - standard SuperMemo-2 calculation
   */
  private static handleGood(
    currentInterval: number,
    currentEase: number,
    repetitions: number
  ): AlgorithmResult {
    let newInterval: number;
    
    if (repetitions === 0) {
      // First successful review
      newInterval = 1;
    } else if (repetitions === 1) {
      // Second successful review
      newInterval = 6;
    } else {
      // Standard SuperMemo-2 formula: previous_interval * ease_factor
      newInterval = Math.round(currentInterval * currentEase);
    }
    
    newInterval = Math.max(this.MIN_INTERVAL, newInterval);
    const dueDate = this.calculateDueDate(newInterval);
    
    return {
      interval: newInterval,
      ease: currentEase, // Ease stays the same for "good"
      repetitions: repetitions + 1,
      dueDate
    };
  }

  /**
   * Handle "Easy" response - increase ease and use generous interval (like Anki)
   */
  private static handleEasy(
    currentInterval: number,
    currentEase: number,
    repetitions: number
  ): AlgorithmResult {
    const newEase = currentEase + this.EASE_ADJUSTMENT;
    
    let newInterval: number;
    if (repetitions === 0) {
      // Easy on first try - skip ahead to 4 days
      newInterval = 4;
    } else if (repetitions === 1) {
      // Easy on second try - skip ahead significantly
      newInterval = 15;
    } else {
      // Standard calculation with easy bonus
      newInterval = Math.round(currentInterval * newEase * 1.3);
    }
    
    newInterval = Math.max(this.MIN_INTERVAL, newInterval);
    const dueDate = this.calculateDueDate(newInterval);
    
    return {
      interval: newInterval,
      ease: newEase,
      repetitions: repetitions + 1,
      dueDate
    };
  }

  /**
   * Calculate due date from interval in days
   */
  private static calculateDueDate(intervalDays: number): number {
    // Validate intervalDays to prevent NaN timestamps
    if (!isFinite(intervalDays) || intervalDays < 0) {
      console.warn('Invalid intervalDays passed to calculateDueDate:', intervalDays, 'using MIN_INTERVAL');
      intervalDays = this.MIN_INTERVAL;
    }
    
    const now = Date.now();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return now + (intervalDays * millisecondsPerDay);
  }

  /**
   * Check if a card is due for review
   * Uses the same logic as the UI: due if overdue or due today
   */
  static isDue(card: Card, currentTime: number = Date.now()): boolean {
    return isDueByEndOfToday(card.algorithm.dueDate, currentTime);
  }

  /**
   * Get cards that are due for review, sorted by priority
   */
  static filterDueCards(
    cards: Card[],
    currentTime: number = Date.now()
  ): Card[] {
    const dueCards = cards.filter(q => this.isDue(q, currentTime));
    
    // Sort by due date (overdue first), then by interval (shorter first for urgency)
    return dueCards.sort((a, b) => {
      const aDueDate = a.algorithm.dueDate;
      const bDueDate = b.algorithm.dueDate;
      
      // First sort by how overdue they are
      if (aDueDate !== bDueDate) {
        return aDueDate - bDueDate;
      }
      
      // If same due date, prioritize shorter intervals (more urgent)
      return a.algorithm.interval - b.algorithm.interval;
    });
  }

  /**
   * Get time until next review for a card
   */
  static getTimeUntilDue(card: Card, currentTime: number = Date.now()): number {
    return Math.max(0, card.algorithm.dueDate - currentTime);
  }

  /**
   * Initialize algorithm data for new cards
   */
  static initializeNewCard(): AlgorithmResult {
    return {
      interval: this.MIN_INTERVAL,
      ease: this.INITIAL_EASE,
      repetitions: 0,
      dueDate: Date.now() // Due immediately for new cards
    };
  }

  /**
   * Validate and repair algorithm data for existing cards
   */
  static validateAlgorithmData(algorithm: any): AlgorithmResult {
    // Ensure all numeric values are finite numbers
    const safeInterval = (typeof algorithm.interval === 'number' && isFinite(algorithm.interval)) 
      ? algorithm.interval : this.MIN_INTERVAL;
    const safeEase = (typeof algorithm.ease === 'number' && isFinite(algorithm.ease)) 
      ? algorithm.ease : this.INITIAL_EASE;
    const safeRepetitions = (typeof algorithm.repetitions === 'number' && isFinite(algorithm.repetitions)) 
      ? algorithm.repetitions : 0;
    const safeDueDate = (typeof algorithm.dueDate === 'number' && isFinite(algorithm.dueDate)) 
      ? algorithm.dueDate : Date.now();

    const interval = Math.max(this.MIN_INTERVAL, safeInterval);
    const ease = Math.max(this.MIN_EASE, safeEase);
    const repetitions = Math.max(0, safeRepetitions);
    const dueDate = safeDueDate;

    return { interval, ease, repetitions, dueDate };
  }

  /**
   * Calculate next occurrence times for all difficulty levels (for UI display)
   * Returns formatted time strings like "1m", "10m", "1d", "3d"
   */
  static calculateNextOccurrences(card: Card): {
    again: string;
    hard: string;
    good: string;
    easy: string;
  } {
    const difficulties: Array<'again' | 'hard' | 'good' | 'easy'> = ['again', 'hard', 'good', 'easy'];
    const results: any = {};

    difficulties.forEach(difficulty => {
      const result = this.calculateNext(card, difficulty);
      results[difficulty] = this.formatTimeInterval(result.interval);
    });

    return results;
  }

  /**
   * Format interval in days to human-readable time string
   * Examples: 1 → "1d", 0.02 → "30m", 7 → "1w", 30 → "1mo"
   */
  private static formatTimeInterval(intervalDays: number): string {
    // Handle very small intervals (less than 1 day)
    if (intervalDays < 1) {
      const hours = intervalDays * 24;
      if (hours < 1) {
        const minutes = Math.max(1, Math.round(hours * 60));
        return `${minutes}m`;
      } else {
        const roundedHours = Math.round(hours);
        return `${roundedHours}h`;
      }
    }

    // Handle intervals in days
    if (intervalDays < 7) {
      return `${Math.round(intervalDays)}d`;
    }

    // Handle intervals in weeks
    if (intervalDays < 30) {
      const weeks = Math.round(intervalDays / 7);
      return weeks === 1 ? '1w' : `${weeks}w`;
    }

    // Handle intervals in months
    if (intervalDays < 365) {
      const months = Math.round(intervalDays / 30);
      return months === 1 ? '1mo' : `${months}mo`;
    }

    // Handle intervals in years
    const years = Math.round(intervalDays / 365);
    return years === 1 ? '1y' : `${years}y`;
  }
} 