export interface TTSOptions {
  text: string;
  language: string;
  voice: string;
  model?: string;
  speed?: number;
  pitch?: number;
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  languageCode: string;
  gender?: 'male' | 'female' | 'neutral';
  description?: string;
  model?: string; // Voice model type (e.g., 'Neural2', 'WaveNet', 'Standard', 'Chirp3', 'Gemini')
}

export interface TTSProvider {
  synthesize(text: string, options: TTSOptions): Promise<ArrayBuffer>;
  
  getAvailableVoices(languageCode?: string): Promise<Voice[]>;
  
  validateApiKey(key: string): Promise<boolean>;
  
  getName(): string;
  
  estimateCost(text: string): number;
}

export interface TTSProviderConfig {
  apiKey: string;
  provider: 'google' | 'openai' | 'elevenlabs';
  customEndpoint?: string;
}

export abstract class BaseTTSProvider implements TTSProvider {
  protected apiKey: string;
  protected providerName: string;

  constructor(apiKey: string, providerName: string) {
    this.apiKey = apiKey;
    this.providerName = providerName;
  }

  abstract synthesize(text: string, options: TTSOptions): Promise<ArrayBuffer>;
  
  abstract getAvailableVoices(languageCode?: string): Promise<Voice[]>;
  
  abstract validateApiKey(key: string): Promise<boolean>;

  getName(): string {
    return this.providerName;
  }

  abstract estimateCost(text: string): number;

  protected async generateHash(
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

