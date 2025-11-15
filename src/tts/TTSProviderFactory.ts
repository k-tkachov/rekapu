import { TTSProvider, TTSProviderConfig } from './TTSProvider';
import { GoogleTTSProvider } from './providers/GoogleTTSProvider';

export class TTSProviderFactory {
  private static instance: TTSProviderFactory;
  private providers: Map<string, TTSProvider> = new Map();

  private constructor() {}

  static getInstance(): TTSProviderFactory {
    if (!TTSProviderFactory.instance) {
      TTSProviderFactory.instance = new TTSProviderFactory();
    }
    return TTSProviderFactory.instance;
  }

  createProvider(config: TTSProviderConfig): TTSProvider {
    const cacheKey = `${config.provider}:${config.apiKey.substring(0, 10)}`;
    
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    let provider: TTSProvider;

    switch (config.provider) {
      case 'google':
        provider = new GoogleTTSProvider(config.apiKey);
        break;
      
      case 'openai':
        throw new Error('OpenAI TTS provider not yet implemented. Use Google TTS for MVP.');
      
      case 'elevenlabs':
        throw new Error('ElevenLabs TTS provider not yet implemented. Use Google TTS for MVP.');
      
      default:
        throw new Error(`Unknown TTS provider: ${config.provider}`);
    }

    this.providers.set(cacheKey, provider);
    return provider;
  }

  clearCache(): void {
    this.providers.clear();
  }

  getSupportedProviders(): string[] {
    return ['google'];
  }
}

