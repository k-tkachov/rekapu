import { Card } from '../types';

export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function calendarDayDelta(dueDate: number, now: number = Date.now()): number {
  // Use calendar arithmetic to avoid DST issues
  const dueD = new Date(dueDate);
  const nowD = new Date(now);
  
  // Reset both to start of day in local timezone
  dueD.setHours(0, 0, 0, 0);
  nowD.setHours(0, 0, 0, 0);
  
  // Calculate difference in days using date arithmetic
  const diffMs = dueD.getTime() - nowD.getTime();
  return Math.round(diffMs / MILLISECONDS_PER_DAY);
}

export function isDueByEndOfToday(dueDate: number, now: number = Date.now()): boolean {
  return dueDate <= endOfDay(now);
}

export function formatDueBadge(
  dueDate: number,
  now: number = Date.now()
): { text: string; bg: string; color: string; urgent: boolean } {
  const delta = calendarDayDelta(dueDate, now);
  const nowStart = startOfDay(now);
  const dueStart = startOfDay(dueDate);

  // Overdue
  if (dueDate <= now) {
    if (dueStart === nowStart) {
      return { text: 'Due now', bg: '#da3633', color: 'white', urgent: true };
    }
    const daysPast = Math.floor((nowStart - dueStart) / MILLISECONDS_PER_DAY);
    return { text: `${Math.max(1, daysPast)}d overdue`, bg: '#da3633', color: 'white', urgent: true };
  }

  // Due later today
  if (isDueByEndOfToday(dueDate, now)) {
    return {
      text: 'Due today',
      bg: '#fb8500',
      color: 'white',
      urgent: true,
    };
  }

  if (delta === 1) {
    return {
      text: 'Due tomorrow',
      bg: '#f85149',
      color: 'white',
      urgent: false,
    };
  }

  if (delta < 7) {
    return {
      text: `${delta}d`,
      bg: '#35363a',
      color: '#9aa0a6',
      urgent: false,
    };
  }

  if (delta < 30) {
    const weeks = Math.floor(delta / 7);
    return {
      text: `${weeks}w`,
      bg: '#35363a',
      color: '#5f6368',
      urgent: false,
    };
  }

  const months = Math.floor(delta / 30);
  return {
    text: `${months}mo`,
    bg: '#35363a',
    color: '#5f6368',
    urgent: false,
  };
}

/**
 * Get the effective due date for a card, handling cloze cards specially
 * For cloze cards, returns the earliest due date among all deletions
 * For other cards, returns the main algorithm due date
 */
export function getEffectiveDueDate(card: Card): number {
  // For non-cloze cards, use the main algorithm due date
  if (card.type !== 'cloze') {
    return card.algorithm.dueDate;
  }

  // For cloze cards, find the earliest due date among deletions
  if (card.clozeDeletions && card.clozeDeletions.length > 0) {
    const dueDates = card.clozeDeletions
      .filter(deletion => deletion.algorithm && typeof deletion.algorithm.dueDate === 'number' && isFinite(deletion.algorithm.dueDate))
      .map(deletion => deletion.algorithm.dueDate);
    
    if (dueDates.length > 0) {
      return Math.min(...dueDates);
    }
  }

  // Fallback to main algorithm due date if no valid deletions
  return card.algorithm.dueDate;
}
