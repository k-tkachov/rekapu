/**
 * Client-side Statistics API
 * Provides access to statistics data through message passing to background script
 */

import { 
  HeatMapData, 
  StreakInfo, 
  PerformanceMetrics, 
  BacklogInfo, 
  ProblematicCard, 
  TimeWaster 
} from './StatisticsEngine';

export interface StatisticsAPIResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class StatisticsAPI {
  /**
   * Send message to background script and wait for response
   */
  private static async sendMessage(action: string, data?: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action, data }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'No response received' });
        }
      });
    });
  }

  /**
   * Get heat map data for a date range
   */
  static async getHeatMapData(
    startDate: Date, 
    endDate: Date,
    tagNames?: string[]
  ): Promise<StatisticsAPIResult<HeatMapData>> {
    return this.sendMessage('stats_getHeatMapData', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      tagNames
    });
  }

  /**
   * Get current streak information
   */
  static async getStreakInfo(): Promise<StatisticsAPIResult<StreakInfo>> {
    return this.sendMessage('stats_getStreakInfo');
  }

  /**
   * Get comprehensive performance metrics
   */
  static async getPerformanceMetrics(tagNames?: string[]): Promise<StatisticsAPIResult<PerformanceMetrics>> {
    return this.sendMessage('stats_getPerformanceMetrics', { tagNames });
  }

  /**
   * Get available years from daily statistics
   */
  static async getAvailableYears(): Promise<StatisticsAPIResult<number[]>> {
    return this.sendMessage('stats_getAvailableYears');
  }

  /**
   * Get backlog and projection information
   */
  static async getBacklogInfo(
    tagNames?: string[], 
    dailyGoal?: number
  ): Promise<StatisticsAPIResult<BacklogInfo>> {
    return this.sendMessage('stats_getBacklogInfo', { tagNames, dailyGoal });
  }

  /**
   * Get problematic cards that need attention
   */
  static async getProblematicCards(
    tagNames?: string[],
    limit?: number
  ): Promise<StatisticsAPIResult<ProblematicCard[]>> {
    return this.sendMessage('stats_getProblematicCards', { tagNames, limit });
  }

  /**
   * Get top time-waster domains
   */
  static async getTopTimeWasters(
    limit?: number
  ): Promise<StatisticsAPIResult<TimeWaster[]>> {
    return this.sendMessage('stats_getTopTimeWasters', { limit });
  }

  /**
   * Get all statistics data in one call for dashboard
   */
  static async getAllStatistics(
    startDate: Date,
    endDate: Date,
    tagNames?: string[]
  ): Promise<{
    heatMap: StatisticsAPIResult<HeatMapData>;
    streak: StatisticsAPIResult<StreakInfo>;
    performance: StatisticsAPIResult<PerformanceMetrics>;
  }> {
    // Run all requests in parallel for better performance
    const [heatMapResult, streakResult, performanceResult] = await Promise.all([
      this.getHeatMapData(startDate, endDate, tagNames),
      this.getStreakInfo(), // Streak remains unfiltered (global)
      this.getPerformanceMetrics(tagNames)
    ]);

    return {
      heatMap: heatMapResult,
      streak: streakResult,
      performance: performanceResult
    };
  }
} 