/**
 * i18n utility for Chrome extension
 * Provides helper functions for internationalization using chrome.i18n API
 * 
 * Chrome Extension i18n behavior:
 * - Chrome automatically selects the language based on the browser's UI language
 * - The extension will use the best matching locale from available _locales folders
 * - For example: if browser is in Russian, it will use _locales/ru/messages.json
 * - If no matching locale exists, it falls back to default_locale (specified in manifest.json as "en")
 * 
 * To change language:
 * - Users should change their Chrome display language at chrome://settings/languages
 * - After changing Chrome's language, reload the extension to see the new translations
 */

export function t(messageName: string, substitutions?: string | string[]): string {
  try {
    return chrome.i18n.getMessage(messageName, substitutions);
  } catch (error) {
    console.error(`i18n error for key "${messageName}":`, error);
    return messageName;
  }
}

export function getMessage(messageName: string, substitutions?: string | string[]): string {
  return t(messageName, substitutions);
}

export function getUILanguage(): string {
  return chrome.i18n.getUILanguage();
}

/**
 * Get the plural form for any language using Intl.PluralRules
 * Returns: 'zero', 'one', 'two', 'few', 'many', or 'other'
 * 
 * Examples:
 * - English: 1 -> 'one', 2+ -> 'other'
 * - Russian: 1,21,31... -> 'one', 2-4,22-24... -> 'few', 0,5-20... -> 'many'
 * - Arabic: has all 6 forms including 'zero' and 'two'
 */
export function getPluralForm(count: number, locale?: string): Intl.LDMLPluralRule {
  const lang = locale || getUILanguage();
  const pr = new Intl.PluralRules(lang);
  return pr.select(count);
}

/**
 * Get pluralized message with automatic plural form selection
 * 
 * @param baseKey - Base key without plural suffix (e.g., 'domain')
 * @param count - The count to determine plural form
 * @returns The correctly pluralized message
 * 
 * Usage:
 * messages.json should have keys like:
 * - "domainOne": "domain"
 * - "domainOther": "domains"
 * - "domainFew": "домена" (for Russian)
 * - "domainMany": "доменов" (for Russian)
 */
export function getPlural(baseKey: string, count: number): string {
  const form = getPluralForm(count);
  // Capitalize first letter: 'one' -> 'One', 'other' -> 'Other'
  const capitalizedForm = form.charAt(0).toUpperCase() + form.slice(1);
  const key = `${baseKey}${capitalizedForm}`;
  
  const message = t(key);
  // If the specific plural form doesn't exist, fall back to 'other' form
  if (message === key) {
    const fallbackKey = `${baseKey}Other`;
    return t(fallbackKey);
  }
  
  return message;
}

export const i18n = {
  t,
  getMessage,
  getUILanguage,
  getPluralForm,
  getPlural,
};

export default i18n;
