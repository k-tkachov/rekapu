/**
 * Statistics Aggregation Engine for Rekapu Extension
 * 
 * Handles real-time statistics calculation, streak tracking, and performance analytics.
 * Designed for efficient incremental updates and caching.
 */

import { indexedDBManager } from './IndexedDBManager';
import {
  DailyStatsRecord,
  StreakDataRecord,
  DomainBlockingStatsRecord,
  TagPerformanceRecord,
  CardResponseRecord
} from './IndexedDBSchema';

export interface StatisticsResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface HeatMapData {
  [date: string]: {
    count: number;
    level: number; // 0-4 for heat map intensity
    details: {
      cardsAnswered: number;
      correctAnswers: number;
      studyTime: number;
      accuracy: number;
    };
  };
}

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  streakActive: boolean;
  daysUntilStreakBreak: number;
  streakStartDate: string;
  bestStreakPeriod: {
    start: string;
    end: string;
    duration: number;
  };
  weeklyAverage: number;
  totalActiveDays: number;
  todayProgress: {
    cardsAnswered: number;
    dailyGoal: number;
    cardsNeeded: number;
  };
  weeklyDays: Array<{
    date: string;  // YYYY-MM-DD
    dayName: string;  // Mon, Tue, etc.
    completed: boolean;  // Did they meet goal this day
    isToday: boolean;
    qualityCards: number;
  }>;
}

export interface PerformanceMetrics {
  overall: {
    totalCards: number;
    totalCorrect: number;
    accuracy: number;
    averageResponseTime: number;
    totalStudyTime: number;
    cardsPerDay: number;
  };
  byTag: {
    [tagName: string]: {
      accuracy: number;
      responseTime: number;
      studyTime: number;
      cardsAnswered: number;
      improvement: number; // percentage change over time
    };
  };
  timeSaved: {
    totalMinutes: number;
    byDomain: {
      [domain: string]: {
        timeSaved: number;
        blockCount: number;
        averageSession: number;
      };
    };
  };
  trends: {
    accuracyTrend: number; // positive = improving
    speedTrend: number;    // negative = getting faster
    streakTrend: number;   // positive = improving consistency
  };
}

export interface BacklogInfo {
  backlogCount: number;
  recentPace: number; // median cards per day over last 7 days
  daysToClear: number;
  todaysPlan: number; // recommended cards for today
  dailyGoal: number;
}

export interface ProblematicCard {
  cardId: string;
  title: string;
  tags: string[];
  reviewCount: number;
  againCount: number;
  hardCount: number;
  easeFactor: number;
  lastReviewed: number;
  issue: 'high_again' | 'high_hard' | 'low_ease' | 'ease_drop';
}

export interface TimeWaster {
  domain: string;
  blockCount: number;
  last30Days: number;
  averageDailyBlocks: number;
  cooldownPeriod: number;
  subdomainsIncluded: boolean;
}

/**
 * Statistics Engine for comprehensive analytics
 */
export class StatisticsEngine {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly DEFAULT_MINIMUM_CARDS = 1; // Minimum cards per day for streak

  /**
   * Get or set cached data
   */
  private static getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setCachedData<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  /**
   * Update daily statistics after a card response
   */
  static async updateDailyStats(
    cardResponse: CardResponseRecord,
    tags: string[] = []
  ): Promise<StatisticsResult<DailyStatsRecord>> {
    try {
      const today = this.formatDate(new Date(cardResponse.timestamp));
      const todayTimestamp = this.getStartOfDay(new Date(cardResponse.timestamp));

      // Get existing daily stats or create new
      const existingResult = await indexedDBManager.getDailyStats(today);
      if (!existingResult.success) {
        return { success: false, error: existingResult.error };
      }

      const existingStats = existingResult.data || this.createEmptyDailyStats(today, todayTimestamp);

      // Get daily goal from settings
      const settingsResult = await indexedDBManager.getGlobalSettings();
      const dailyGoal = settingsResult.data?.data.dailyGoal || this.DEFAULT_MINIMUM_CARDS;

      const newCardCount = existingStats.cardsAnswered + 1;

      // Update stats with new response
      const updatedStats: DailyStatsRecord = {
        ...existingStats,
        cardsAnswered: newCardCount,
        correctAnswers: existingStats.correctAnswers + (cardResponse.wasCorrect ? 1 : 0),
        totalStudyTime: existingStats.totalStudyTime + cardResponse.responseTime,
        streakContribution: newCardCount >= dailyGoal
      };

      // Update tag breakdown
      for (const tag of tags) {
        if (!updatedStats.tagBreakdown[tag]) {
          updatedStats.tagBreakdown[tag] = {
            cardsAnswered: 0,
            correctAnswers: 0,
            studyTime: 0
          };
        }
        updatedStats.tagBreakdown[tag].cardsAnswered += 1;
        updatedStats.tagBreakdown[tag].correctAnswers += cardResponse.wasCorrect ? 1 : 0;
        updatedStats.tagBreakdown[tag].studyTime += cardResponse.responseTime;
      }

      // Save updated stats
      const saveResult = await indexedDBManager.setDailyStats(updatedStats);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      // Update streak data if this qualifies
      if (updatedStats.streakContribution) {
        await this.updateStreakData(today, todayTimestamp);
      }

      // Update tag performance
      for (const tag of tags) {
        await this.updateTagPerformance(tag, cardResponse);
      }

      // Clear relevant caches
      this.invalidateCache(['heatmap', 'streak', 'performance']);

      return { success: true, data: updatedStats };
    } catch (error) {
      return { success: false, error: `Failed to update daily stats: ${error}` };
    }
  }

  /**
   * Update domain blocking statistics
   */
  static async updateDomainBlockingStats(
    domain: string,
    timeSaved: number
  ): Promise<StatisticsResult<DomainBlockingStatsRecord>> {
    try {
      const today = this.formatDate(new Date());
      const now = Date.now();

      // Get existing stats or create new
      const existingResult = await indexedDBManager.getDomainBlockingStats(domain);
      if (!existingResult.success) {
        return { success: false, error: existingResult.error };
      }

      const existingStats = existingResult.data || this.createEmptyDomainStats(domain, now);

      // Update stats
      const updatedStats: DomainBlockingStatsRecord = {
        ...existingStats,
        totalBlockCount: existingStats.totalBlockCount + 1,
        totalTimeSaved: existingStats.totalTimeSaved + timeSaved,
        lastBlocked: now,
        averageBlockDuration: Math.round((existingStats.totalTimeSaved + timeSaved) / (existingStats.totalBlockCount + 1))
      };

      // Update daily breakdown
      if (!updatedStats.dailyBreakdown[today]) {
        updatedStats.dailyBreakdown[today] = {
          blockCount: 0,
          timeSaved: 0,
          lastAccess: 0
        };
      }
      updatedStats.dailyBreakdown[today].blockCount += 1;
      updatedStats.dailyBreakdown[today].timeSaved += timeSaved;
      updatedStats.dailyBreakdown[today].lastAccess = now;

      // Update peak usage hours
      const hour = new Date(now).getHours();
      if (!updatedStats.peakUsageHours.includes(hour)) {
        updatedStats.peakUsageHours.push(hour);
        updatedStats.peakUsageHours.sort((a, b) => a - b);
      }

      // Save updated stats
      const saveResult = await indexedDBManager.setDomainBlockingStats(updatedStats);
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      // Update daily stats with domain blocking info
      await this.updateDailyStatsWithBlocking(today, timeSaved);

      // Clear relevant caches
      this.invalidateCache(['performance', 'timeSaved']);

      return { success: true, data: updatedStats };
    } catch (error) {
      return { success: false, error: `Failed to update domain blocking stats: ${error}` };
    }
  }

  /**
   * Calculate streak information by scanning backwards from today
   * Streak breaks if ANY day is missed (no grace period)
   */
  static async calculateStreakInfo(): Promise<StatisticsResult<StreakInfo>> {
    try {
      // Check cache first
      const cached = this.getCachedData<StreakInfo>('streak');
      if (cached) {
        return { success: true, data: cached };
      }

      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      // Get daily goal from settings
      const settingsResult = await indexedDBManager.getGlobalSettings();
      const dailyGoal = settingsResult.data?.data.dailyGoal || this.DEFAULT_MINIMUM_CARDS;

      // Calculate ACTUAL current streak by scanning backwards from today
      let currentStreak = 0;
      let streakStartDate = now;
      let bestStreak = 0;
      let bestStreakStart = 0;
      let bestStreakEnd = 0;
      let totalActiveDays = 0;
      
      // Get last 365 days of stats to calculate real streak
      const recentStatsResult = await indexedDBManager.getRecentDailyStats(365);
      if (!recentStatsResult.success) {
        return { success: false, error: recentStatsResult.error };
      }
      
      const allStats = recentStatsResult.data || [];
      
      // Build a map of date -> stats for quick lookup
      const statsMap = new Map<string, DailyStatsRecord>();
      for (const stat of allStats) {
        statsMap.set(stat.date, stat);
        if (stat.streakContribution) {
          totalActiveDays++;
        }
      }
      
      // Check if today's goal is already met
      const today = this.formatDate(new Date(now));
      const todayStats = statsMap.get(today);
      const todayGoalMet = todayStats && todayStats.streakContribution;
      
      // Start from yesterday if today's goal is not yet met, otherwise start from today
      let checkDate = todayGoalMet ? new Date(now) : new Date(now - oneDayMs);
      let tempStreakStart = now;
      
      while (true) {
        const dateStr = this.formatDate(checkDate);
        const dayStats = statsMap.get(dateStr);
        
        // If no stats or didn't meet goal, streak ends
        if (!dayStats || !dayStats.streakContribution) {
          break;
        }
        
        currentStreak++;
        tempStreakStart = dayStats.timestamp;
        
        // Move to previous day
        checkDate = new Date(checkDate.getTime() - oneDayMs);
        
        // Safety: don't go back more than 365 days
        if (checkDate.getTime() < (now - 365 * oneDayMs)) {
          break;
        }
      }
      
      streakStartDate = tempStreakStart;
      
      // Find best streak in history
      let tempBestStreak = 0;
      let tempBestStart = 0;
      let tempBestEnd = 0;
      
      // Sort stats by date
      const sortedStats = [...allStats].sort((a, b) => a.timestamp - b.timestamp);
      
      for (let i = 0; i < sortedStats.length; i++) {
        if (sortedStats[i].streakContribution) {
          let streakLen = 1;
          let streakStart = sortedStats[i].timestamp;
          let j = i + 1;
          
          // Count consecutive days
          while (j < sortedStats.length) {
            const prevDate = this.formatDate(new Date(sortedStats[j-1].timestamp));
            const currDate = this.formatDate(new Date(sortedStats[j].timestamp));
            const daysDiff = Math.round((new Date(currDate).getTime() - new Date(prevDate).getTime()) / oneDayMs);
            
            if (daysDiff === 1 && sortedStats[j].streakContribution) {
              streakLen++;
              j++;
            } else {
              break;
            }
          }
          
          if (streakLen > tempBestStreak) {
            tempBestStreak = streakLen;
            tempBestStart = streakStart;
            tempBestEnd = sortedStats[j-1].timestamp;
          }
          
          i = j - 1;
        }
      }
      
      bestStreak = Math.max(tempBestStreak, currentStreak);
      bestStreakStart = tempBestStreak > currentStreak ? tempBestStart : streakStartDate;
      bestStreakEnd = tempBestStreak > currentStreak ? tempBestEnd : now;

      // Get today's progress
      const todayCardsAnswered = todayStats?.cardsAnswered || 0;
      const cardsNeeded = Math.max(0, dailyGoal - todayCardsAnswered);

      // Calculate weekly average
      const last28Days = allStats.filter(s => s.timestamp > (now - 28 * oneDayMs));
      const activeDaysInPeriod = last28Days.filter(d => d.streakContribution).length;
      const weeklyAverage = (activeDaysInPeriod / 4);

      // Streak is active only if today's goal is met OR we have any current streak
      const streakActive = todayCardsAnswered >= dailyGoal || currentStreak > 0;
      const daysUntilBreak = todayCardsAnswered >= dailyGoal ? 1 : 0;

      // Build weekly days array (current week)
      const weekStartsOnMonday = settingsResult.data?.data.weekStartsOnMonday ?? true;
      const weeklyDays = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Find start of current week
      const todayDate = new Date(now);
      const todayDayOfWeek = todayDate.getDay(); // 0 = Sunday, 6 = Saturday
      const daysFromWeekStart = weekStartsOnMonday 
        ? (todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1) // Monday-based: Monday=0, Sunday=6
        : todayDayOfWeek; // Sunday-based: Sunday=0, Saturday=6
      
      const weekStartDate = new Date(now - daysFromWeekStart * oneDayMs);
      
      // Build array for 7 days starting from week start
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStartDate.getTime() + i * oneDayMs);
        const dateStr = this.formatDate(dayDate);
        const dayStats = statsMap.get(dateStr);
        const isToday = dateStr === today;
        
        weeklyDays.push({
          date: dateStr,
          dayName: dayNames[dayDate.getDay()],
          completed: dayStats ? dayStats.streakContribution : false,
          isToday,
          qualityCards: dayStats ? dayStats.cardsAnswered : 0
        });
      }

      const streakInfo: StreakInfo = {
        currentStreak,
        bestStreak,
        streakActive,
        daysUntilStreakBreak: daysUntilBreak,
        streakStartDate: this.formatDate(new Date(streakStartDate)),
        bestStreakPeriod: {
          start: this.formatDate(new Date(bestStreakStart)),
          end: this.formatDate(new Date(bestStreakEnd)),
          duration: bestStreak
        },
        weeklyAverage: Math.round(weeklyAverage * 10) / 10,
        totalActiveDays,
        todayProgress: {
          cardsAnswered: todayCardsAnswered,
          dailyGoal,
          cardsNeeded
        },
        weeklyDays
      };

      // Cache the result with shorter TTL since streak changes daily
      this.setCachedData('streak', streakInfo, 60000); // 1 minute cache

      return { success: true, data: streakInfo };
    } catch (error) {
      return { success: false, error: `Failed to calculate streak info: ${error}` };
    }
  }

  /**
   * Get available years from daily stats
   */
  static async getAvailableYears(): Promise<StatisticsResult<number[]>> {
    try {
      // Get all daily stats to extract available years
      const statsResult = await indexedDBManager.getAllDailyStats();
      if (!statsResult.success) {
        return { success: false, error: statsResult.error };
      }

      const dailyStats = statsResult.data || [];
      const years = new Set<number>();
      
      dailyStats.forEach(stat => {
        // Date format is YYYY-MM-DD
        const year = parseInt(stat.date.substring(0, 4), 10);
        if (!isNaN(year)) {
          years.add(year);
        }
      });
      
      // Return years sorted newest first
      const sortedYears = Array.from(years).sort((a, b) => b - a);
      
      return { success: true, data: sortedYears };
    } catch (error) {
      return { success: false, error: `Failed to get available years: ${error}` };
    }
  }

  /**
   * Generate heat map data for visualization
   */
  static async generateHeatMapData(
    startDate: Date,
    endDate: Date,
    tagNames?: string[]
  ): Promise<StatisticsResult<HeatMapData>> {
    try {
      const tagFilter = tagNames && tagNames.length > 0 ? tagNames.sort().join(',') : '';
      const cacheKey = `heatmap-${this.formatDate(startDate)}-${this.formatDate(endDate)}-${tagFilter}`;
      
      // Check cache first
      const cached = this.getCachedData<HeatMapData>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const startDateStr = this.formatDate(startDate);
      const endDateStr = this.formatDate(endDate);

      const statsResult = await indexedDBManager.getDailyStatsRange(startDateStr, endDateStr);
      if (!statsResult.success) {
        return { success: false, error: statsResult.error };
      }

      const dailyStats = statsResult.data || [];
      const heatMapData: HeatMapData = {};

      // Helper function to get filtered stats for a day
      const getFilteredDayStats = (dayStats: typeof dailyStats[0]) => {
        if (!tagNames || tagNames.length === 0) {
          // No filtering - use total stats
          return {
            cardsAnswered: dayStats.cardsAnswered,
            correctAnswers: dayStats.correctAnswers,
            studyTime: dayStats.totalStudyTime
          };
        }

        // Tag filtering - aggregate from tagBreakdown
        let filteredCards = 0;
        let filteredCorrect = 0;
        let filteredStudyTime = 0;

        for (const tagName of tagNames) {
          const tagStats = dayStats.tagBreakdown[tagName];
          if (tagStats) {
            filteredCards += tagStats.cardsAnswered;
            filteredCorrect += tagStats.correctAnswers;
            filteredStudyTime += tagStats.studyTime;
          }
        }

        return {
          cardsAnswered: filteredCards,
          correctAnswers: filteredCorrect,
          studyTime: filteredStudyTime
        };
      };

      // Calculate max cards for normalization using filtered data
      const filteredCounts = dailyStats.map(s => getFilteredDayStats(s).cardsAnswered);
      const maxCards = Math.max(...filteredCounts, 1);

      // Fill in all dates in range
      const rangeEndDateStr = this.formatDate(endDate);
      const currentDate = new Date(startDate);
      let currentDateStr = this.formatDate(currentDate);
      
      while (currentDateStr <= rangeEndDateStr) {
        const dayStats = dailyStats.find(s => s.date === currentDateStr);

        if (dayStats) {
          const filtered = getFilteredDayStats(dayStats);
          const level = this.calculateHeatMapLevel(filtered.cardsAnswered, maxCards);
          const accuracy = filtered.cardsAnswered > 0 
            ? Math.round((filtered.correctAnswers / filtered.cardsAnswered) * 100) 
            : 0;

          heatMapData[currentDateStr] = {
            count: filtered.cardsAnswered,
            level,
            details: {
              cardsAnswered: filtered.cardsAnswered,
              correctAnswers: filtered.correctAnswers,
              studyTime: filtered.studyTime,
              accuracy
            }
          };
        } else {
          heatMapData[currentDateStr] = {
            count: 0,
            level: 0,
            details: {
              cardsAnswered: 0,
              correctAnswers: 0,
              studyTime: 0,
              accuracy: 0
            }
          };
        }

        currentDate.setDate(currentDate.getDate() + 1);
        currentDateStr = this.formatDate(currentDate);
      }

      // Cache the result with short TTL (1 minute) to keep current day updated
      this.setCachedData(cacheKey, heatMapData, 60000);

      return { success: true, data: heatMapData };
    } catch (error) {
      return { success: false, error: `Failed to generate heat map data: ${error}` };
    }
  }

  /**
   * Get backlog and projection information
   */
  static async getBacklogInfo(tagNames?: string[], dailyGoal: number = 1): Promise<StatisticsResult<BacklogInfo>> {
    try {
      const now = Date.now();
      
      let dueCardsResult;
      if (tagNames && tagNames.length > 0) {
        dueCardsResult = await indexedDBManager.getDueCardsByTags(tagNames, []);
      } else {
        dueCardsResult = await indexedDBManager.getDueCards();
      }
      
      if (!dueCardsResult.success) {
        return { success: false, error: dueCardsResult.error };
      }

      const dueCards = dueCardsResult.data || [];
      const backlogCount = dueCards.filter(q => !q.isDraft).length;

      // Get daily stats for last 7 days to calculate pace
      const sevenDaysAgo = this.formatDate(new Date(now - 7 * 24 * 60 * 60 * 1000));
      const today = this.formatDate(new Date(now));
      const recentStatsResult = await indexedDBManager.getDailyStatsRange(sevenDaysAgo, today);
      
      if (!recentStatsResult.success) {
        return { success: false, error: recentStatsResult.error };
      }

      const recentStats = recentStatsResult.data || [];
      
      // Calculate pace (median of last 7 days)
      const dailyCounts = recentStats.map(stat => {
        if (!tagNames || tagNames.length === 0) {
          return stat.cardsAnswered;
        }
        
        // Sum tag breakdown for filtered pace
        return tagNames.reduce((sum, tagName) => {
          const tagStat = stat.tagBreakdown[tagName];
          return sum + (tagStat?.cardsAnswered || 0);
        }, 0);
      });
      
      dailyCounts.sort((a, b) => a - b);
      const recentPace = dailyCounts.length > 0 
        ? dailyCounts[Math.floor(dailyCounts.length / 2)] 
        : 0;

      // Calculate days to clear
      const daysToClear = recentPace > 0 
        ? Math.ceil(backlogCount / recentPace) 
        : (backlogCount > 0 ? 999 : 0);

      // Calculate today's plan: max of goal or ceil(backlog/7)
      const todaysPlan = Math.max(dailyGoal, Math.ceil(backlogCount / 7));

      const backlogInfo: BacklogInfo = {
        backlogCount,
        recentPace: Math.round(recentPace * 10) / 10,
        daysToClear,
        todaysPlan,
        dailyGoal
      };

      return { success: true, data: backlogInfo };
    } catch (error) {
      return { success: false, error: `Failed to calculate backlog info: ${error}` };
    }
  }

  /**
   * Get problematic cards that need attention
   */
  static async getProblematicCards(tagNames?: string[], limit: number = 5): Promise<StatisticsResult<ProblematicCard[]>> {
    try {
      const cardIdsResult = await indexedDBManager.getCardIdsWithMinResponses(3);
      if (!cardIdsResult.success) {
        return { success: false, error: cardIdsResult.error };
      }

      const reviewedCardIds = cardIdsResult.data || [];
      
      if (reviewedCardIds.length === 0) {
        return { success: true, data: [] };
      }

      const cardsResult = await indexedDBManager.getCardsByIds(reviewedCardIds);
      if (!cardsResult.success) {
        return { success: false, error: cardsResult.error };
      }

      let cards = cardsResult.data || [];

      if (tagNames && tagNames.length > 0) {
        cards = cards.filter(q => 
          q.tags.some(tag => tagNames.includes(tag))
        );
      }

      cards = cards.filter(q => !q.isDraft);

      const problematicCards: ProblematicCard[] = [];

      for (const card of cards) {
        const responsesResult = await indexedDBManager.getCardResponses(card.id);
        if (!responsesResult.success) continue;

        const responses = responsesResult.data || [];
        
        if (responses.length < 3) continue;

        const recentResponses = responses
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5);

        const againCount = recentResponses.filter(r => r.difficulty === 'again').length;
        const hardCount = recentResponses.filter(r => r.difficulty === 'hard').length;
        const easeFactor = card.algorithm.ease;

        let issue: ProblematicCard['issue'] | null = null;
        
        if (againCount >= 2) {
          issue = 'high_again';
        } else if (againCount + hardCount >= 3) {
          issue = 'high_hard';
        } else if (easeFactor < 1.5) {
          issue = 'low_ease';
        } else if (responses.length >= 5) {
          const olderResponses = responses.slice(5, 10);
          if (olderResponses.length > 0) {
            const oldEase = olderResponses[0]?.difficulty === 'easy' ? 2.5 : 2.0;
            if (oldEase - easeFactor > 0.5) {
              issue = 'ease_drop';
            }
          }
        }

        if (issue) {
          problematicCards.push({
            cardId: card.id,
            title: card.front.substring(0, 100),
            tags: card.tags,
            reviewCount: responses.length,
            againCount,
            hardCount,
            easeFactor,
            lastReviewed: responses[0]?.timestamp || 0,
            issue
          });
        }
      }

      problematicCards.sort((a, b) => {
        if (a.againCount !== b.againCount) {
          return b.againCount - a.againCount;
        }
        return b.hardCount - a.hardCount;
      });

      return { success: true, data: problematicCards.slice(0, limit) };
    } catch (error) {
      return { success: false, error: `Failed to get problematic cards: ${error}` };
    }
  }

  /**
   * Get top time-waster domains
   */
  static async getTopTimeWasters(limit: number = 5): Promise<StatisticsResult<TimeWaster[]>> {
    try {
      // Get all domain blocking stats
      const domainStatsResult = await indexedDBManager.getAllDomainBlockingStats();
      if (!domainStatsResult.success) {
        return { success: false, error: domainStatsResult.error };
      }

      const allDomainStats = domainStatsResult.data || [];

      // Get domain settings for cooldown periods
      const domainsResult = await indexedDBManager.getAllDomains();
      if (!domainsResult.success) {
        return { success: false, error: domainsResult.error };
      }

      const domains = domainsResult.data || [];
      const domainMap = new Map(domains.map(d => [d.domain, d]));

      // Calculate stats for last 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const timeWasters: TimeWaster[] = allDomainStats
        .map(stat => {
          // Count blocks in last 30 days
          const last30Days = Object.entries(stat.dailyBreakdown)
            .filter(([date]) => {
              const dateTimestamp = new Date(date).getTime();
              return dateTimestamp >= thirtyDaysAgo;
            })
            .reduce((sum, [, breakdown]) => sum + breakdown.blockCount, 0);

          const domainSettings = domainMap.get(stat.domain);

          return {
            domain: stat.domain,
            blockCount: stat.totalBlockCount,
            last30Days,
            averageDailyBlocks: Math.round((last30Days / 30) * 10) / 10,
            cooldownPeriod: domainSettings?.cooldownPeriod || 0,
            subdomainsIncluded: domainSettings?.subdomainsIncluded || false
          };
        })
        .filter(tw => tw.last30Days > 0) // Only include domains with recent blocks
        .sort((a, b) => b.last30Days - a.last30Days) // Sort by recent activity
        .slice(0, limit);

      return { success: true, data: timeWasters };
    } catch (error) {
      return { success: false, error: `Failed to get top time wasters: ${error}` };
    }
  }

  /**
   * Calculate comprehensive performance metrics
   */
  static async calculatePerformanceMetrics(tagNames?: string[]): Promise<StatisticsResult<PerformanceMetrics>> {
    try {
      // Check cache first (include tagNames in cache key)
      const tagFilter = tagNames && tagNames.length > 0 ? tagNames.sort().join(',') : '';
      const cacheKey = `performance-${tagFilter}`;
      const cached = this.getCachedData<PerformanceMetrics>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // Get recent responses (last 30 days)
      const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const responsesResult = await indexedDBManager.getRecentResponses(30);
      if (!responsesResult.success) {
        return { success: false, error: responsesResult.error };
      }

      const responses = responsesResult.data || [];

      // Get tag performance data
      const tagPerfResult = await indexedDBManager.getAllTagPerformance();
      if (!tagPerfResult.success) {
        return { success: false, error: tagPerfResult.error };
      }

      const tagPerformance = tagPerfResult.data || [];

      // Get domain blocking stats
      const domainStatsResult = await indexedDBManager.getAllDomainBlockingStats();
      if (!domainStatsResult.success) {
        return { success: false, error: domainStatsResult.error };
      }

      const domainStats = domainStatsResult.data || [];

      // Calculate overall metrics
      const totalCards = responses.length;
      const totalCorrect = responses.filter(r => r.wasCorrect).length;
      const totalStudyTime = responses.reduce((sum, r) => sum + r.responseTime, 0);
      const totalTimeSaved = domainStats.reduce((sum, d) => sum + d.totalTimeSaved, 0);

      // Calculate trends (compare last 15 days vs previous 15 days)
      const recentResponses = responses.filter(r => r.timestamp > Date.now() - (15 * 24 * 60 * 60 * 1000));
      const olderResponses = responses.filter(r => 
        r.timestamp <= Date.now() - (15 * 24 * 60 * 60 * 1000) && 
        r.timestamp > Date.now() - (30 * 24 * 60 * 60 * 1000)
      );

      const recentAccuracy = recentResponses.length > 0 
        ? recentResponses.filter(r => r.wasCorrect).length / recentResponses.length 
        : 0;
      const olderAccuracy = olderResponses.length > 0 
        ? olderResponses.filter(r => r.wasCorrect).length / olderResponses.length 
        : 0;

      const recentSpeed = recentResponses.length > 0 
        ? recentResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentResponses.length 
        : 0;
      const olderSpeed = olderResponses.length > 0 
        ? olderResponses.reduce((sum, r) => sum + r.responseTime, 0) / olderResponses.length 
        : 0;

      const metrics: PerformanceMetrics = {
        overall: {
          totalCards,
          totalCorrect,
          accuracy: totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0,
          averageResponseTime: totalCards > 0 ? Math.round(totalStudyTime / totalCards) : 0,
          totalStudyTime,
          cardsPerDay: Math.round((totalCards / 30) * 10) / 10
        },
        byTag: {},
        timeSaved: {
          totalMinutes: Math.round(totalTimeSaved / (60 * 1000)),
          byDomain: {}
        },
        trends: {
          accuracyTrend: Math.round((recentAccuracy - olderAccuracy) * 100),
          speedTrend: Math.round(olderSpeed - recentSpeed), // Negative = getting faster (better)
          streakTrend: 0 // Will be calculated by comparing streak periods
        }
      };

      // Fill tag performance
      tagPerformance.forEach(tag => {
        metrics.byTag[tag.tagName] = {
          accuracy: Math.round(tag.averageAccuracy),
          responseTime: Math.round(tag.averageResponseTime),
          studyTime: tag.totalStudyTime,
          cardsAnswered: tag.totalAnswered,
          improvement: this.calculateTagImprovement(tag)
        };
      });

      // Fill domain time saved
      domainStats.forEach(domain => {
        metrics.timeSaved.byDomain[domain.domain] = {
          timeSaved: Math.round(domain.totalTimeSaved / (60 * 1000)), // minutes
          blockCount: domain.totalBlockCount,
          averageSession: Math.round(domain.averageBlockDuration / (60 * 1000)) // minutes
        };
      });

      // Cache the result
      this.setCachedData(cacheKey, metrics);

      return { success: true, data: metrics };
    } catch (error) {
      return { success: false, error: `Failed to calculate performance metrics: ${error}` };
    }
  }

  // =================== PRIVATE HELPER METHODS ===================

  private static async updateStreakData(date: string, timestamp: number): Promise<void> {
    const existingResult = await indexedDBManager.getStreakData();
    const existing = existingResult.data || this.createEmptyStreakData();

    const yesterday = this.formatDate(new Date(timestamp - 24 * 60 * 60 * 1000));
    const wasActiveYesterday = await this.wasActiveDuringDate(yesterday);

    let newStreak = existing.currentStreak;
    let newStreakStart = existing.currentStreakStart;

    if (wasActiveYesterday || existing.currentStreak === 0) {
      // Continue or start streak
      newStreak = existing.currentStreak + 1;
      if (existing.currentStreak === 0) {
        newStreakStart = timestamp;
      }
    } else {
      // Reset streak
      newStreak = 1;
      newStreakStart = timestamp;
    }

    const updatedStreakData: StreakDataRecord = {
      ...existing,
      currentStreak: newStreak,
      bestStreak: Math.max(existing.bestStreak, newStreak),
      currentStreakStart: newStreakStart,
      lastActivity: timestamp,
      totalActiveDays: existing.totalActiveDays + 1,
      lastUpdated: Date.now()
    };

    // Update best streak period if we have a new record
    if (newStreak > existing.bestStreak) {
      updatedStreakData.bestStreakPeriod = {
        start: newStreakStart,
        end: timestamp
      };
    }

    await indexedDBManager.setStreakData(updatedStreakData);
  }

  private static async updateTagPerformance(
    tagName: string,
    response: CardResponseRecord
  ): Promise<void> {
    const existingResult = await indexedDBManager.getTagPerformance(tagName);
    const existing = existingResult.data || this.createEmptyTagPerformance(tagName, response.timestamp);

    const updatedPerformance: TagPerformanceRecord = {
      ...existing,
      totalAnswered: existing.totalAnswered + 1,
      correctAnswers: existing.correctAnswers + (response.wasCorrect ? 1 : 0),
      averageAccuracy: Math.round(((existing.correctAnswers + (response.wasCorrect ? 1 : 0)) / (existing.totalAnswered + 1)) * 100),
      averageResponseTime: Math.round(((existing.averageResponseTime * existing.totalAnswered) + response.responseTime) / (existing.totalAnswered + 1)),
      totalStudyTime: existing.totalStudyTime + response.responseTime,
      lastStudied: response.timestamp
    };

    // Update difficulty distribution
    updatedPerformance.difficultyDistribution[response.difficulty] += 1;

    await indexedDBManager.setTagPerformance(updatedPerformance);
  }

  private static async updateDailyStatsWithBlocking(date: string, timeSaved: number): Promise<void> {
    const existingResult = await indexedDBManager.getDailyStats(date);
    if (existingResult.success && existingResult.data) {
      const updated = {
        ...existingResult.data,
        domainsBlocked: existingResult.data.domainsBlocked + 1,
        timeSaved: existingResult.data.timeSaved + timeSaved
      };
      await indexedDBManager.setDailyStats(updated);
    }
  }

  private static async wasActiveDuringDate(date: string): Promise<boolean> {
    const result = await indexedDBManager.getDailyStats(date);
    return result.success && result.data?.streakContribution === true;
  }

  private static calculateHeatMapLevel(cardsAnswered: number, maxCards: number): number {
    if (cardsAnswered === 0) return 0;
    const ratio = cardsAnswered / maxCards;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  private static calculateTagImprovement(tag: TagPerformanceRecord): number {
    // Calculate improvement based on weekly progress
    const weeks = Object.keys(tag.weeklyProgress);
    if (weeks.length < 2) return 0;

    weeks.sort();
    const recent = tag.weeklyProgress[weeks[weeks.length - 1]];
    const older = tag.weeklyProgress[weeks[0]];

    return Math.round((recent.accuracy - older.accuracy) * 100) / 100;
  }

  /**
   * Invalidate cached data based on key patterns
   * @public - exposed for cache management from other modules
   */
  static invalidateCache(keys: string[]): void {
    for (const [cacheKey] of this.cache) {
      if (keys.some(key => cacheKey.includes(key))) {
        this.cache.delete(cacheKey);
      }
    }
  }

  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private static getStartOfDay(date: Date): number {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }

  private static createEmptyDailyStats(date: string, timestamp: number): DailyStatsRecord {
    return {
      date,
      timestamp,
      cardsAnswered: 0,
      correctAnswers: 0,
      totalStudyTime: 0,
      domainsBlocked: 0,
      timeSaved: 0,
      studySessions: 0,
      streakContribution: false,
      tagBreakdown: {}
    };
  }

  private static createEmptyStreakData(): StreakDataRecord {
    const now = Date.now();
    return {
      key: 'streaks',
      currentStreak: 0,
      bestStreak: 0,
      currentStreakStart: now,
      bestStreakPeriod: { start: now, end: now },
      lastActivity: 0,
      minimumCards: this.DEFAULT_MINIMUM_CARDS,
      totalActiveDays: 0,
      weeklyStats: {},
      lastUpdated: now
    };
  }

  private static createEmptyDomainStats(domain: string, timestamp: number): DomainBlockingStatsRecord {
    return {
      domain,
      totalBlockCount: 0,
      totalTimeSaved: 0,
      averageBlockDuration: 0,
      lastBlocked: timestamp,
      firstBlocked: timestamp,
      dailyBreakdown: {},
      peakUsageHours: [],
      categoryTags: []
    };
  }

  private static createEmptyTagPerformance(tagName: string, timestamp: number): TagPerformanceRecord {
    return {
      tagName,
      totalCards: 0,
      totalAnswered: 0,
      correctAnswers: 0,
      averageAccuracy: 0,
      averageResponseTime: 0,
      totalStudyTime: 0,
      lastStudied: timestamp,
      firstStudied: timestamp,
      difficultyDistribution: {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0
      },
      weeklyProgress: {},
      easeFactor: {
        average: 2.5,
        range: { min: 2.5, max: 2.5 }
      }
    };
  }
} 