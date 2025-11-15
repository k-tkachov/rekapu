// Dynamic translations loader - add new languages by creating folders
async function loadTranslation(locale: string, page: string) {
  try {
    const translation = await import(`./${locale}/${page}.json`);
    return translation.default;
  } catch (e) {
    // Fallback to English if translation doesn't exist
    const fallback = await import(`./en/${page}.json`);
    return fallback.default;
  }
}

export async function getTranslations(locale: string = 'en') {
  const [common, landing, docs, meta] = await Promise.all([
    loadTranslation(locale, 'common'),
    loadTranslation(locale, 'landing'),
    loadTranslation(locale, 'docs'),
    loadTranslation(locale, 'meta'),
  ]);

  return { common, landing, docs, meta };
}

export async function getPageTranslations(locale: string = 'en', page: 'common' | 'landing' | 'docs' | 'meta' | 'privacy') {
  return await loadTranslation(locale, page);
}
