import { TTSProvider, TTSOptions } from './TTSProvider';
import { TTSProviderFactory } from './TTSProviderFactory';
import { TTSCacheManager } from './TTSCacheManager';
import { TTSKeyStorage } from './TTSKeyStorage';

export interface SynthesizeRequest {
  text: string;
  language: string;
  voice?: string;
  model?: string;
  speed?: number;
  pitch?: number;
}

export interface TTSServiceResult {
  success: boolean;
  audio?: ArrayBuffer;
  cached?: boolean;
  error?: string;
  costEstimate?: number;
}

export class TTSService {
  private static instance: TTSService;
  private factory: TTSProviderFactory;
  private cacheManager: TTSCacheManager;
  private keyStorage: TTSKeyStorage;
  private initialized: boolean = false;

  private constructor() {
    this.factory = TTSProviderFactory.getInstance();
    this.cacheManager = TTSCacheManager.getInstance();
    this.keyStorage = TTSKeyStorage.getInstance();
  }

  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.cacheManager.initialize();
    this.initialized = true;
  }

  async synthesize(request: SynthesizeRequest): Promise<TTSServiceResult> {
    try {
      await this.initialize();

      const settings = await this.keyStorage.getSettings();
      if (!settings) {
        return {
          success: false,
          error: 'TTS not configured. Please set up TTS in settings.'
        };
      }

      const apiKey = settings.keys[settings.provider];
      if (!apiKey) {
        return {
          success: false,
          error: `API key not found for provider: ${settings.provider}`
        };
      }

      const voice = request.voice || settings.selectedVoices[request.language];
      if (!voice) {
        return {
          success: false,
          error: `No voice selected for language: ${request.language}`
        };
      }

      const hash = await this.generateHash(
        request.text,
        request.language,
        voice,
        settings.provider
      );

      const cachedAudio = await this.cacheManager.get(hash);
      if (cachedAudio) {
        return {
          success: true,
          audio: cachedAudio,
          cached: true
        };
      }

      const provider = this.factory.createProvider({
        provider: settings.provider,
        apiKey
      });

      const options: TTSOptions = {
        text: request.text,
        language: request.language,
        voice,
        model: request.model,
        speed: request.speed,
        pitch: request.pitch
      };

      const audio = await provider.synthesize(request.text, options);

      await this.cacheManager.set(
        hash,
        audio,
        request.text,
        request.language,
        voice,
        settings.provider
      );

      const costEstimate = provider.estimateCost(request.text);

      return {
        success: true,
        audio,
        cached: false,
        costEstimate
      };

    } catch (error) {
      console.error('TTS synthesis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAvailableVoices(languageCode?: string): Promise<any[]> {
    try {
      const settings = await this.keyStorage.getSettings();
      if (!settings) {
        throw new Error('TTS not configured');
      }

      const apiKey = settings.keys[settings.provider];
      if (!apiKey) {
        throw new Error(`API key not found for provider: ${settings.provider}`);
      }

      const provider = this.factory.createProvider({
        provider: settings.provider,
        apiKey
      });

      return await provider.getAvailableVoices(languageCode);
    } catch (error) {
      console.error('Failed to get available voices:', error);
      throw error;
    }
  }

  async validateApiKey(provider: 'google' | 'openai' | 'elevenlabs', apiKey: string): Promise<boolean> {
    try {
      const ttsProvider = this.factory.createProvider({
        provider,
        apiKey
      });

      return await ttsProvider.validateApiKey(apiKey);
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }

  async getCacheStatistics() {
    return await this.cacheManager.getStatistics();
  }

  async clearCache(): Promise<void> {
    await this.cacheManager.clear();
  }

  async clearCacheByProvider(provider: string): Promise<number> {
    return await this.cacheManager.clearByProvider(provider);
  }

  async updateCacheLimit(sizeBytes: number): Promise<void> {
    await this.cacheManager.setMaxSize(sizeBytes);
    await this.keyStorage.updateCacheSizeLimit(sizeBytes);
  }

  private async generateHash(
    text: string,
    language: string,
    voice: string,
    provider: string
  ): Promise<string> {
    const data = `${text}|${language}|${voice}|${provider}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

