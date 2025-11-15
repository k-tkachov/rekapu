export interface DomainSettings {
  domain: string;
  cooldownPeriod: number; // minutes
  isActive: boolean;
  lastUnblock: number; // timestamp
  subdomainsIncluded: boolean;
  created: number;
  modified: number;
}

export interface Card {
  id: string;
  front: string;
  back: string;
  type: 'basic' | 'cloze';
  tags: string[];
  created: number;
  modified: number;
  isDraft: boolean;
  algorithm: {
    dueDate: number;
    interval: number;
    ease: number;
    repetitions: number;
  };
  // Cloze-specific fields
  clozeSource?: string; // Original text with cloze markers
  clozeDeletions?: Array<{
    id: number; // c1, c2, etc.
    text: string; // The text to be hidden
    hint?: string; // Optional hint
    algorithm: {
      dueDate: number;
      interval: number;
      ease: number;
      repetitions: number;
    };
  }>;
}

// Lightweight version for list views - excludes large fields like back content
export interface CardSummary {
  id: string;
  front: string;
  type: 'basic' | 'cloze';
  tags: string[];
  created: number;
  modified: number;
  isDraft: boolean;
  algorithm: {
    dueDate: number;
    interval: number;
    ease: number;
    repetitions: number;
  };
  // Lightweight preview of back content (first 100 chars)
  backPreview: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created: number;
}

export interface StudySession {
  cardId: string;
  timestamp: number;
  difficulty: 'again' | 'hard' | 'good' | 'easy';
  responseTime: number; // milliseconds
  wasCorrect: boolean;
}

export interface StorageKeys {
  DOMAINS: 'domains';
  CARDS: 'cards';
  TAGS: 'tags';
  SESSIONS: 'sessions';
  SETTINGS: 'settings';
}

export interface AppSettings {
  defaultCooldownPeriod: number; // minutes
  maxCardsPerSession: number;
  theme: 'light' | 'dark';
  dailyGoal: number; // minimum quality cards per day for streak
  weekStartsOnMonday: boolean; // true = Monday-Sunday, false = Sunday-Saturday
}

export interface BlockedPageMessage {
  type: 'DOMAIN_UNBLOCKED' | 'FORCE_RELOAD';
  domain: string;
  card?: Card;
  timeRemaining?: number;
}

export type CardType = Card['type'];
export type Difficulty = StudySession['difficulty'];

// Backward compatibility aliases
export type Question = Card;
export type QuestionSummary = CardSummary;
export type QuestionType = CardType; 