/**
 * Calendar utilities for multi-year statistics display
 */

/**
 * Extract unique years from daily stats data
 */
export const getAvailableYears = (dailyStatsKeys: string[]): number[] => {
  const years = new Set<number>();
  
  dailyStatsKeys.forEach(dateStr => {
    // Date format is YYYY-MM-DD - validate format first
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const year = parseInt(dateStr.substring(0, 4), 10);
      if (!isNaN(year) && year >= 1000 && year <= 9999) {
        years.add(year);
      }
    }
  });
  
  return Array.from(years).sort((a, b) => b - a); // Most recent first
};

/**
 * Get start and end dates for a given year
 */
export const getYearDateRange = (year: number): { startDate: Date; endDate: Date } => {
  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31); // December 31st
  
  return { startDate, endDate };
};

/**
 * Get the current year
 */
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Format year for display (e.g., "2024", "2023")
 */
export const formatYear = (year: number): string => {
  return year.toString();
};

/**
 * Check if a year is the current year
 */
export const isCurrentYear = (year: number): boolean => {
  return year === getCurrentYear();
};

/**
 * Get default selected year (current year if available, otherwise most recent)
 */
export const getDefaultSelectedYear = (availableYears: number[]): number => {
  const currentYear = getCurrentYear();
  
  if (availableYears.includes(currentYear)) {
    return currentYear;
  }
  
  // Return the most recent year if current year not available
  if (availableYears.length === 0) {
    return currentYear;
  }
  
  // Find the maximum year (most recent)
  return Math.max(...availableYears);
};
