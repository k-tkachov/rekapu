import { IndexedDBManager } from '../storage/IndexedDBManager';
import { STORE_NAMES, AudioCacheRecord } from '../storage/IndexedDBSchema';

export interface CacheStatistics {
  totalEntries: number;
  totalSizeBytes: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

export interface CacheConfig {
  maxSizeBytes: number;  // Default 100MB
}

export class TTSCacheManager {
  private static instance: TTSCacheManager;
  private dbManager: IndexedDBManager;
  private config: CacheConfig;
  
  private hitCount: number = 0;
  private missCount: number = 0;

  private constructor() {
    this.dbManager = IndexedDBManager.getInstance();
    this.config = {
      maxSizeBytes: 100 * 1024 * 1024  // 100MB default
    };
  }

  static getInstance(): TTSCacheManager {
    if (!TTSCacheManager.instance) {
      TTSCacheManager.instance = new TTSCacheManager();
    }
    return TTSCacheManager.instance;
  }

  async initialize(): Promise<void> {
    await this.dbManager.initialize();
  }

  async setMaxSize(maxSizeBytes: number): Promise<void> {
    this.config.maxSizeBytes = maxSizeBytes;
    await this.enforceLimit();
  }

  getMaxSize(): number {
    return this.config.maxSizeBytes;
  }

  async get(hash: string): Promise<ArrayBuffer | null> {
    const result = await this.dbManager.get<AudioCacheRecord>(
      STORE_NAMES.AUDIO_CACHE,
      hash
    );

    if (!result.success || !result.data) {
      this.missCount++;
      return null;
    }

    this.hitCount++;
    
    await this.updateAccessMetadata(hash, result.data);
    
    return result.data.audioData;
  }

  async set(
    hash: string,
    audioData: ArrayBuffer,
    text: string,
    language: string,
    voice: string,
    provider: string
  ): Promise<void> {
    const now = Date.now();
    const sizeBytes = audioData.byteLength;

    const cacheEntry: AudioCacheRecord = {
      hash,
      audioData,
      text,
      language,
      voice,
      provider,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      sizeBytes
    };

    await this.dbManager.put(STORE_NAMES.AUDIO_CACHE, cacheEntry);
    
    await this.enforceLimit();
  }

  private async updateAccessMetadata(hash: string, entry: AudioCacheRecord): Promise<void> {
    const updatedEntry: AudioCacheRecord = {
      ...entry,
      lastAccessedAt: Date.now(),
      accessCount: entry.accessCount + 1
    };

    await this.dbManager.put(STORE_NAMES.AUDIO_CACHE, updatedEntry);
  }

  private async enforceLimit(): Promise<void> {
    const stats = await this.getCacheSize();
    
    if (stats.totalSizeBytes <= this.config.maxSizeBytes) {
      return;
    }

    const bytesToFree = stats.totalSizeBytes - this.config.maxSizeBytes;
    await this.evictLRU(bytesToFree);
  }

  private async evictLRU(bytesToFree: number): Promise<void> {
    const allEntries = await this.dbManager.getAll<AudioCacheRecord>(
      STORE_NAMES.AUDIO_CACHE
    );

    if (!allEntries.success || !allEntries.data) {
      return;
    }

    const entries = allEntries.data.sort((a: AudioCacheRecord, b: AudioCacheRecord) => {
      const scoreA = this.calculatePriorityScore(a);
      const scoreB = this.calculatePriorityScore(b);
      return scoreA - scoreB;
    });

    let freedBytes = 0;
    const toDelete: string[] = [];

    for (const entry of entries) {
      if (freedBytes >= bytesToFree) {
        break;
      }
      
      toDelete.push(entry.hash);
      freedBytes += entry.sizeBytes;
    }

    for (const hash of toDelete) {
      await this.dbManager.delete(STORE_NAMES.AUDIO_CACHE, hash);
    }

    console.log(`Evicted ${toDelete.length} entries, freed ${freedBytes} bytes`);
  }

  private calculatePriorityScore(entry: AudioCacheRecord): number {
    const now = Date.now();
    const ageMs = now - entry.createdAt;
    const timeSinceLastAccessMs = now - entry.lastAccessedAt;
    
    const recencyScore = 1 / (timeSinceLastAccessMs / (1000 * 60 * 60));
    const frequencyScore = entry.accessCount;
    const ageScore = 1 / (ageMs / (1000 * 60 * 60 * 24));
    
    return (recencyScore * 0.5) + (frequencyScore * 0.3) + (ageScore * 0.2);
  }

  async clear(): Promise<void> {
    const allEntries = await this.dbManager.getAll<AudioCacheRecord>(
      STORE_NAMES.AUDIO_CACHE
    );

    if (!allEntries.success || !allEntries.data) {
      return;
    }

    for (const entry of allEntries.data) {
      await this.dbManager.delete(STORE_NAMES.AUDIO_CACHE, entry.hash);
    }

    this.hitCount = 0;
    this.missCount = 0;

    console.log('Cache cleared');
  }

  async clearByProvider(provider: string): Promise<number> {
    const allEntries = await this.dbManager.getAll<AudioCacheRecord>(
      STORE_NAMES.AUDIO_CACHE
    );

    if (!allEntries.success || !allEntries.data) {
      return 0;
    }

    const toDelete = allEntries.data.filter((entry: AudioCacheRecord) => entry.provider === provider);

    for (const entry of toDelete) {
      await this.dbManager.delete(STORE_NAMES.AUDIO_CACHE, entry.hash);
    }

    return toDelete.length;
  }

  async getStatistics(): Promise<CacheStatistics> {
    const sizeStats = await this.getCacheSize();
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

    return {
      ...sizeStats,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate
    };
  }

  private async getCacheSize(): Promise<{
    totalEntries: number;
    totalSizeBytes: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> {
    const allEntries = await this.dbManager.getAll<AudioCacheRecord>(
      STORE_NAMES.AUDIO_CACHE
    );

    if (!allEntries.success || !allEntries.data || allEntries.data.length === 0) {
      return {
        totalEntries: 0,
        totalSizeBytes: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    const entries = allEntries.data;
    const totalSizeBytes = entries.reduce((sum: number, entry: AudioCacheRecord) => sum + entry.sizeBytes, 0);
    const timestamps = entries.map((e: AudioCacheRecord) => e.createdAt);

    return {
      totalEntries: entries.length,
      totalSizeBytes,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps)
    };
  }

  async has(hash: string): Promise<boolean> {
    const result = await this.dbManager.get<AudioCacheRecord>(
      STORE_NAMES.AUDIO_CACHE,
      hash
    );

    return result.success && result.data !== null;
  }

  resetStatistics(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }
}

