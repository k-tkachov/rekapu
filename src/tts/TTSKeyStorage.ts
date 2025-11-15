export interface TTSKeys {
  google?: string;
  openai?: string;
  elevenlabs?: string;
}

export interface TTSTagConfig {
  language: string;
  model: string;
  voice: string;
  cardSide: 'front' | 'back' | 'both';
}

export interface TTSSettings {
  provider: 'google' | 'openai' | 'elevenlabs';
  keys: TTSKeys;
  selectedVoices: {
    [languageCode: string]: string;
  };
  cacheSizeLimit: number;
  enabledTags: string[];
  tagConfigs: {
    [tagName: string]: TTSTagConfig;
  };
}

export class TTSKeyStorage {
  private static instance: TTSKeyStorage;
  private readonly storageKey = 'tts_settings';

  private constructor() {}

  static getInstance(): TTSKeyStorage {
    if (!TTSKeyStorage.instance) {
      TTSKeyStorage.instance = new TTSKeyStorage();
    }
    return TTSKeyStorage.instance;
  }

  async saveSettings(settings: TTSSettings): Promise<void> {
    // chrome.storage.local is already isolated from web pages and provides
    // OS-level encryption at rest. Additional app-level encryption would be
    // security theater since we have no secure place to store the encryption key.
    await chrome.storage.local.set({
      [this.storageKey]: settings
    });
  }

  async getSettings(): Promise<TTSSettings | null> {
    const result = await chrome.storage.local.get(this.storageKey);
    return result[this.storageKey] || null;
  }

  async getApiKey(provider: 'google' | 'openai' | 'elevenlabs'): Promise<string | null> {
    const settings = await this.getSettings();
    if (!settings) {
      return null;
    }

    return settings.keys[provider] || null;
  }

  async saveApiKey(
    provider: 'google' | 'openai' | 'elevenlabs',
    apiKey: string
  ): Promise<void> {
    const settings = await this.getSettings();
    const currentSettings = settings || {
      provider: 'google',
      keys: {},
      selectedVoices: {},
      cacheSizeLimit: 100 * 1024 * 1024,
      enabledTags: [],
      tagConfigs: {}
    };

    currentSettings.keys[provider] = apiKey;
    await this.saveSettings(currentSettings);
  }

  async deleteApiKey(provider: 'google' | 'openai' | 'elevenlabs'): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) {
      return;
    }

    delete settings.keys[provider];
    await this.saveSettings(settings);
  }

  async clearAllKeys(): Promise<void> {
    await chrome.storage.local.remove(this.storageKey);
  }

  async updateProvider(provider: 'google' | 'openai' | 'elevenlabs'): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) {
      return;
    }

    settings.provider = provider;
    await this.saveSettings(settings);
  }

  async updateSelectedVoice(languageCode: string, voiceId: string): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) {
      return;
    }

    settings.selectedVoices[languageCode] = voiceId;
    await this.saveSettings(settings);
  }

  async updateCacheSizeLimit(sizeBytes: number): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) {
      return;
    }

    settings.cacheSizeLimit = sizeBytes;
    await this.saveSettings(settings);
  }

  async setEnabledTags(tags: string[]): Promise<void> {
    const settings = await this.getSettings();
    const currentSettings = settings || {
      provider: 'google',
      keys: {},
      selectedVoices: {},
      cacheSizeLimit: 100 * 1024 * 1024,
      enabledTags: [],
      tagConfigs: {}
    };

    currentSettings.enabledTags = tags;
    await this.saveSettings(currentSettings);
  }

  async getEnabledTags(): Promise<string[]> {
    const settings = await this.getSettings();
    return settings?.enabledTags || [];
  }

  async isTagEnabled(tag: string): Promise<boolean> {
    const enabledTags = await this.getEnabledTags();
    return enabledTags.includes(tag);
  }

  async setTagConfig(tag: string, config: TTSTagConfig): Promise<void> {
    const settings = await this.getSettings();
    
    const currentSettings: TTSSettings = settings || {
      provider: 'google',
      keys: {},
      selectedVoices: {},
      cacheSizeLimit: 100 * 1024 * 1024,
      enabledTags: [],
      tagConfigs: {}
    };

    // Ensure tagConfigs exists (for backward compatibility)
    if (!currentSettings.tagConfigs) {
      currentSettings.tagConfigs = {};
    }

    currentSettings.tagConfigs[tag] = config;
    
    await this.saveSettings(currentSettings);
  }

  async getTagConfig(tag: string): Promise<TTSTagConfig | null> {
    const settings = await this.getSettings();
    
    if (!settings || !settings.tagConfigs) {
      return null;
    }
    
    return settings.tagConfigs[tag] || null;
  }

  async getAllTagConfigs(): Promise<{ [tagName: string]: TTSTagConfig }> {
    const settings = await this.getSettings();
    return settings?.tagConfigs || {};
  }
}

