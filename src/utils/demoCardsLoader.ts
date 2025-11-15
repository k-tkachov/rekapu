/**
 * Demo cards loader utility
 * Loads demo cards based on user's browser language
 */

import { Card } from '../types/index';
import { StorageManager } from '../storage/StorageManager';
import { DEFAULT_SPACED_REPETITION } from '../types/storage';

// Import demo cards for each language
import enDemoCardsRaw from '../data/demoCards/en.json';
import ruDemoCardsRaw from '../data/demoCards/ru.json';
import ukDemoCardsRaw from '../data/demoCards/uk.json';

interface DemoCardTemplate {
  id: string;
  type: 'basic' | 'cloze';
  front: string;
  back: string;
  tags: string[];
  isDraft: boolean;
  clozeSource?: string;
}

// Cast imported JSON to correct type
const DEMO_CARDS_MAP: Record<string, DemoCardTemplate[]> = {
  'en': enDemoCardsRaw as DemoCardTemplate[],
  'ru': ruDemoCardsRaw as DemoCardTemplate[],
  'uk': ukDemoCardsRaw as DemoCardTemplate[],
};

const DEMO_CARDS_LOADED_KEY = 'demoCardsLoaded';

/**
 * Get the base language code from browser language
 * e.g., "en-US" -> "en", "ru-RU" -> "ru"
 */
function getBaseLanguage(locale: string): string {
  return locale.split('-')[0].toLowerCase();
}

/**
 * Get demo cards for the user's language
 * Falls back to English if language is not supported
 */
function getDemoCardsForLanguage(locale: string): DemoCardTemplate[] {
  const baseLanguage = getBaseLanguage(locale);
  
  // Return cards for the language if available, otherwise fall back to English
  return DEMO_CARDS_MAP[baseLanguage] || DEMO_CARDS_MAP['en'];
}

/**
 * Check if demo cards have already been loaded
 */
async function haveDemoCardsBeenLoaded(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(DEMO_CARDS_LOADED_KEY);
    return result[DEMO_CARDS_LOADED_KEY] === true;
  } catch (error) {
    console.error('Error checking demo cards loaded status:', error);
    return false;
  }
}

/**
 * Mark demo cards as loaded
 */
async function markDemoCardsAsLoaded(): Promise<void> {
  try {
    await chrome.storage.local.set({ [DEMO_CARDS_LOADED_KEY]: true });
  } catch (error) {
    console.error('Error marking demo cards as loaded:', error);
  }
}

/**
 * Convert demo card template to full Card object
 */
function templateToCard(template: DemoCardTemplate): Card {
  const now = Date.now();
  
  return {
    id: template.id,
    type: template.type,
    front: template.front,
    back: template.back,
    tags: template.tags,
    created: now,
    modified: now,
    algorithm: { ...DEFAULT_SPACED_REPETITION },
    isDraft: template.isDraft,
    ...(template.clozeSource && { clozeSource: template.clozeSource }),
  };
}

/**
 * Load demo cards into storage on first installation
 * Only loads once - subsequent calls are skipped
 */
export async function loadDemoCards(locale?: string): Promise<{ success: boolean; cardsLoaded: number; error?: string }> {
  try {
    // Check if demo cards have already been loaded
    const alreadyLoaded = await haveDemoCardsBeenLoaded();
    if (alreadyLoaded) {
      return { success: true, cardsLoaded: 0 };
    }

    // Get user's language (from parameter or browser)
    const userLocale = locale || chrome.i18n.getUILanguage();

    // Get demo cards for the user's language
    const demoCardTemplates = getDemoCardsForLanguage(userLocale);
    
    if (demoCardTemplates.length === 0) {
      await markDemoCardsAsLoaded();
      return { success: true, cardsLoaded: 0 };
    }

    // Create cards from templates using direct setCard to preserve IDs
    let loadedCount = 0;
    const indexedDBManager = (await import('../storage/IndexedDBManager')).default;
    
    for (const template of demoCardTemplates) {
      const card = templateToCard(template);
      const result = await indexedDBManager.setCard(card);
      
      if (result.success) {
        loadedCount++;
      } else {
        console.error('Failed to create demo card:', result.error);
      }
    }

    // Mark as loaded so we don't load them again
    await markDemoCardsAsLoaded();

    return { success: true, cardsLoaded: loadedCount };
    
  } catch (error) {
    console.error('Error loading demo cards:', error);
    return { 
      success: false, 
      cardsLoaded: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

