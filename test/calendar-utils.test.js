/**
 * Calendar Utilities Tests (REAL Implementation)
 * 
 * These tests validate the actual calendar utility functions
 * from src/utils/calendarUtils.ts
 * 
 * All test cases use the production utility functions and verify real behavior.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

// Set up TypeScript support for importing TS modules
require('ts-node').register({
  project: './tsconfig.json',
  compilerOptions: {
    module: 'CommonJS'
  }
});

// Import actual calendar utilities
const {
  getAvailableYears,
  getYearDateRange,
  getCurrentYear,
  formatYear,
  isCurrentYear,
  getDefaultSelectedYear
} = require('../src/utils/calendarUtils');

describe('Calendar Utilities (REAL Implementation)', () => {
  describe('getAvailableYears', () => {
    test('should extract unique years from daily stats keys', () => {
      const dailyStatsKeys = [
        '2024-01-15',
        '2024-03-20',
        '2023-12-25',
        '2023-06-10',
        '2022-09-05'
      ];
      
      const result = getAvailableYears(dailyStatsKeys);
      
      assert.deepEqual(result, [2024, 2023, 2022]);
    });
    
    test('should sort years newest first', () => {
      const dailyStatsKeys = [
        '2020-01-01',
        '2024-01-01',
        '2022-01-01',
        '2023-01-01'
      ];
      
      const result = getAvailableYears(dailyStatsKeys);
      
      assert.deepEqual(result, [2024, 2023, 2022, 2020]);
    });
    
    test('should handle duplicate years correctly', () => {
      const dailyStatsKeys = [
        '2024-01-01',
        '2024-06-15',
        '2024-12-31',
        '2023-01-01',
        '2023-07-04'
      ];
      
      const result = getAvailableYears(dailyStatsKeys);
      
      assert.deepEqual(result, [2024, 2023]);
    });
    
    test('should handle empty array', () => {
      const result = getAvailableYears([]);
      assert.deepEqual(result, []);
    });
    
    test('should handle invalid date strings gracefully', () => {
      const dailyStatsKeys = [
        '2024-01-15',
        'invalid-date',
        '2023-12-25',
        'another-invalid'
      ];
      
      const result = getAvailableYears(dailyStatsKeys);
      
      assert.deepEqual(result, [2024, 2023]);
    });
    
    test('should handle malformed date strings', () => {
      const dailyStatsKeys = [
        '2024-01-15',
        '24-01-15', // Wrong format
        '2023-13-45', // Invalid month/day but valid year
        '202X-01-01' // Non-numeric year
      ];
      
      const result = getAvailableYears(dailyStatsKeys);
      
      assert.deepEqual(result, [2024, 2023]);
    });
  });
  
  describe('getYearDateRange', () => {
    test('should return correct start and end dates for a year', () => {
      const result = getYearDateRange(2024);
      
      const expectedStart = new Date(2024, 0, 1); // January 1, 2024
      const expectedEnd = new Date(2024, 11, 31); // December 31, 2024
      
      assert.deepEqual(result.startDate, expectedStart);
      assert.deepEqual(result.endDate, expectedEnd);
    });
    
    test('should handle leap years correctly', () => {
      const result = getYearDateRange(2024); // 2024 is a leap year
      
      assert.strictEqual(result.startDate.getFullYear(), 2024);
      assert.strictEqual(result.startDate.getMonth(), 0); // January
      assert.strictEqual(result.startDate.getDate(), 1);
      
      assert.strictEqual(result.endDate.getFullYear(), 2024);
      assert.strictEqual(result.endDate.getMonth(), 11); // December
      assert.strictEqual(result.endDate.getDate(), 31);
    });
    
    test('should handle non-leap years correctly', () => {
      const result = getYearDateRange(2023); // 2023 is not a leap year
      
      assert.strictEqual(result.startDate.getFullYear(), 2023);
      assert.strictEqual(result.endDate.getFullYear(), 2023);
    });
    
    test('should handle edge case years', () => {
      // Test year 2000 (leap year)
      const result2000 = getYearDateRange(2000);
      assert.strictEqual(result2000.startDate.getFullYear(), 2000);
      assert.strictEqual(result2000.endDate.getFullYear(), 2000);
      
      // Test year 1900 (not a leap year despite being divisible by 4)
      const result1900 = getYearDateRange(1900);
      assert.strictEqual(result1900.startDate.getFullYear(), 1900);
      assert.strictEqual(result1900.endDate.getFullYear(), 1900);
    });
  });
  
  describe('getCurrentYear', () => {
    test('should return current year as number', () => {
      const result = getCurrentYear();
      const expectedYear = new Date().getFullYear();
      
      assert.strictEqual(typeof result, 'number');
      assert.strictEqual(result, expectedYear);
    });
    
    test('should return reasonable year value', () => {
      const result = getCurrentYear();
      
      // Should be within reasonable range (tests could run in future/past)
      assert(result >= 2020);
      assert(result <= 3000);
    });
  });
  
  describe('formatYear', () => {
    test('should format year as string', () => {
      assert.strictEqual(formatYear(2024), '2024');
      assert.strictEqual(formatYear(2023), '2023');
      assert.strictEqual(formatYear(2000), '2000');
    });
    
    test('should handle edge case years', () => {
      assert.strictEqual(formatYear(1), '1');
      assert.strictEqual(formatYear(9999), '9999');
    });
    
    test('should return string type', () => {
      const result = formatYear(2024);
      assert.strictEqual(typeof result, 'string');
    });
  });
  
  describe('isCurrentYear', () => {
    test('should return true for current year', () => {
      const currentYear = new Date().getFullYear();
      assert.strictEqual(isCurrentYear(currentYear), true);
    });
    
    test('should return false for non-current years', () => {
      const currentYear = new Date().getFullYear();
      assert.strictEqual(isCurrentYear(currentYear - 1), false);
      assert.strictEqual(isCurrentYear(currentYear + 1), false);
      assert.strictEqual(isCurrentYear(2000), false);
    });
    
    test('should handle edge cases', () => {
      assert.strictEqual(isCurrentYear(0), false);
      assert.strictEqual(isCurrentYear(-1), false);
      assert.strictEqual(isCurrentYear(9999), false);
    });
  });
  
  describe('getDefaultSelectedYear', () => {
    test('should return current year if available in list', () => {
      const currentYear = new Date().getFullYear();
      const availableYears = [2022, 2023, currentYear, currentYear - 1];
      
      const result = getDefaultSelectedYear(availableYears);
      
      assert.strictEqual(result, currentYear);
    });
    
    test('should return most recent year if current year not available', () => {
      const currentYear = new Date().getFullYear();
      const availableYears = [2020, 2021, 2022]; // None are current year
      
      const result = getDefaultSelectedYear(availableYears);
      
      assert.strictEqual(result, 2022); // Most recent in list
    });
    
    test('should handle empty array', () => {
      const currentYear = new Date().getFullYear();
      const result = getDefaultSelectedYear([]);
      
      assert.strictEqual(result, currentYear);
    });
    
    test('should handle unsorted year arrays', () => {
      const currentYear = new Date().getFullYear();
      const availableYears = [2020, 2024, 2022, 2021]; // Unsorted, but 2024 > current year
      
      const result = getDefaultSelectedYear(availableYears);
      
      // Should pick the most recent year (2024) since current year not in list
      assert.strictEqual(result, 2024); // Most recent year
    });
    
    test('should prefer current year over newer years', () => {
      const currentYear = new Date().getFullYear();
      const futureYear = currentYear + 2;
      const availableYears = [futureYear, currentYear, currentYear - 1];
      
      const result = getDefaultSelectedYear(availableYears);
      
      assert.strictEqual(result, currentYear);
    });
  });
  
  describe('Integration Scenarios (Real Usage Patterns)', () => {
    test('should handle typical calendar workflow', () => {
      // Simulate real daily stats keys from a user with 2+ years of data
      const dailyStatsKeys = [
        '2023-01-01', '2023-01-15', '2023-03-20', '2023-12-25',
        '2024-01-01', '2024-02-14', '2024-06-15', '2024-12-01'
      ];
      
      // Extract available years
      const availableYears = getAvailableYears(dailyStatsKeys);
      assert.deepEqual(availableYears, [2024, 2023]);
      
      // Get default selected year
      const defaultYear = getDefaultSelectedYear(availableYears);
      const currentYear = getCurrentYear();
      
      if (currentYear === 2024 || currentYear === 2023) {
        assert.strictEqual(defaultYear, currentYear);
      } else {
        assert.strictEqual(defaultYear, 2024); // Most recent
      }
      
      // Get date range for selected year
      const dateRange = getYearDateRange(defaultYear);
      assert.strictEqual(dateRange.startDate.getFullYear(), defaultYear);
      assert.strictEqual(dateRange.endDate.getFullYear(), defaultYear);
      
      // Check year formatting
      const formattedYear = formatYear(defaultYear);
      assert.strictEqual(typeof formattedYear, 'string');
      assert.strictEqual(formattedYear, defaultYear.toString());
    });
    
    test('should handle edge case with single year of data', () => {
      const dailyStatsKeys = ['2023-06-15', '2023-07-01', '2023-09-10'];
      
      const availableYears = getAvailableYears(dailyStatsKeys);
      assert.deepEqual(availableYears, [2023]);
      
      const defaultYear = getDefaultSelectedYear(availableYears);
      assert.strictEqual(defaultYear, 2023);
      
      const isCurrentYearValue = isCurrentYear(2023);
      const currentYear = getCurrentYear();
      assert.strictEqual(isCurrentYearValue, currentYear === 2023);
    });
    
    test('should handle future years in data (edge case)', () => {
      const currentYear = getCurrentYear();
      const futureYear = currentYear + 1;
      const dailyStatsKeys = [
        `${currentYear}-01-01`,
        `${futureYear}-01-01`
      ];
      
      const availableYears = getAvailableYears(dailyStatsKeys);
      assert.deepEqual(availableYears, [futureYear, currentYear]);
      
      const defaultYear = getDefaultSelectedYear(availableYears);
      assert.strictEqual(defaultYear, currentYear); // Prefer current year
    });
  });
});
