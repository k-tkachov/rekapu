import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Flex,
  Text,
  Heading,
  SimpleGrid,
  Badge,
  Skeleton,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Icon,
  Select,
  Tooltip,
  IconButton
} from '@chakra-ui/react';
import {
  InfoIcon,
  EditIcon
} from '@chakra-ui/icons';
import { StatisticsAPI } from '../../storage/StatisticsAPI';
import { 
  HeatMapData, 
  StreakInfo, 
  PerformanceMetrics, 
  BacklogInfo, 
  ProblematicCard, 
  TimeWaster 
} from '../../storage/StatisticsEngine';
import TagFilter from './TagFilter';
import { t, i18n } from '../../utils/i18n';

// Helper function to translate day names
const translateDayName = (dayName: string): string => {
  const dayMap: Record<string, string> = {
    'Sun': t('daySun'),
    'Mon': t('dayMon'),
    'Tue': t('dayTue'),
    'Wed': t('dayWed'),
    'Thu': t('dayThu'),
    'Fri': t('dayFri'),
    'Sat': t('daySat'),
  };
  return dayMap[dayName] || dayName;
};

interface StatisticsManagerProps {
  className?: string;
  onEditCard?: (cardId: string) => void;
}

// Material Dark Theme Colors
const theme = {
  bg: '#202124',
  bgSecondary: '#292a2d',
  bgTertiary: '#35363a',
  border: '#3c4043',
  textPrimary: '#e8eaed',
  textSecondary: '#9aa0a6',
  textTertiary: '#5f6368',
  primaryGreen: '#34A853',
  primaryGreenHover: '#46B968',
  secondaryBlue: '#8AB4F8',
  accent: '#8AB4F8',
  success: '#34A853',
  warning: '#FCC934',
  danger: '#F28B82'
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  helpText?: string;
  icon: React.ComponentType;
  color?: 'green' | 'blue' | 'orange' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  helpText,
  icon: IconComponent, 
  color = 'blue' 
}) => {
  const colorMap = {
    green: theme.success,
    blue: theme.secondaryBlue,
    orange: theme.warning,
    purple: theme.accent
  };

  return (
    <Box
      bg={theme.bgTertiary}
      borderWidth={1}
      borderColor={theme.border}
      borderRadius="8px"
      p={4}
      _hover={{ borderColor: '#5f6368' }}
      transition="border-color 0.2s"
    >
      <HStack justify="space-between" align="start">
        <VStack align="start" spacing={1} flex={1}>
          <HStack spacing={1}>
            <Text fontSize="sm" color={theme.textSecondary} fontWeight="medium">
              {title}
            </Text>
            {helpText && (
              <Tooltip label={helpText} placement="top" fontSize="sm">
                <InfoIcon w={3} h={3} color={theme.textTertiary} cursor="help" />
              </Tooltip>
            )}
          </HStack>
          <Text fontSize="2xl" fontWeight="bold" color={theme.textPrimary}>
            {value}
          </Text>
          {subtitle && (
            <Text fontSize="xs" color={theme.textTertiary}>
              {subtitle}
            </Text>
          )}
        </VStack>
        <Box 
          p={2} 
          borderRadius="md" 
          bg={`${colorMap[color]}20`}
          color={colorMap[color]}
        >
          <Icon as={IconComponent} w={5} h={5} />
        </Box>
      </HStack>
    </Box>
  );
};

interface HeatMapProps {
  data: HeatMapData;
  isFiltered?: boolean;
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
}

const HeatMap: React.FC<HeatMapProps> = ({ 
  data, 
  isFiltered = false, 
  selectedYear, 
  availableYears, 
  onYearChange 
}) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Calculate date range for selected year
  const startDate = new Date(selectedYear, 0, 1); // January 1st of selected year
  const endDate = selectedYear === currentYear 
    ? today // If current year, show up to today
    : new Date(selectedYear, 11, 31); // Otherwise show full year

  // Generate weeks array for the calendar grid
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  const currentDate = new Date(startDate);
  // Start from the beginning of the week (Sunday)
  while (currentDate.getDay() !== 0) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (currentDate <= today) {
    if (currentDate.getDay() === 0 && currentWeek.length > 0) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
    currentWeek.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Calculate month labels positioning
  const monthLabels: { label: string; position: number }[] = [];
  const monthNames = [
    t('monthJan'), t('monthFeb'), t('monthMar'), t('monthApr'),
    t('monthMay'), t('monthJun'), t('monthJul'), t('monthAug'),
    t('monthSep'), t('monthOct'), t('monthNov'), t('monthDec')
  ];
  
  let lastMonth = -1;
  weeks.forEach((week, weekIdx) => {
    // Check the first day of the week that's in our date range
    const firstValidDay = week.find(day => day >= startDate && day <= today);
    if (firstValidDay) {
      const month = firstValidDay.getMonth();
      // Only add label if it's a new month and we have enough space
      if (month !== lastMonth && weekIdx > 0) {
        monthLabels.push({
          label: monthNames[month],
          position: weekIdx
        });
        lastMonth = month;
      }
    }
  });

  // Get activity level for a date
  const getActivityLevel = (date: Date): number => {
    // Create UTC date from local date components to match data keys
    // Data is stored with UTC keys, but calendar displays local dates
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dateStr = utcDate.toISOString().split('T')[0];
    
    const dayData = data[dateStr];
    if (!dayData || dayData.details.cardsAnswered === 0) return 0;
    return dayData.level; // Already calculated 0-4 level
  };

  const getActivityColor = (level: number): string => {
    const colors = {
      0: theme.border,
      1: '#0F4A1F',
      2: '#1A7A30', 
      3: '#34A853',
      4: '#4EC169'
    };
    return colors[level as keyof typeof colors];
  };

  const getTooltipText = (date: Date): string => {
    // Create UTC date from local date components to match data keys
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dateStr = utcDate.toISOString().split('T')[0];
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    
    const dayData = data[dateStr];
    
    if (!dayData || dayData.details.cardsAnswered === 0) {
      return `${date.toLocaleDateString(undefined, options)}: ${t('noActivity')}`;
    }
    
    return `${date.toLocaleDateString(undefined, options)}: ${dayData.details.cardsAnswered} ${t('cardsAnswered')} (${dayData.details.accuracy.toFixed(1)}% ${t('accuracy')})`;
  };

  return (
    <Box
      bg={theme.bgTertiary}
      borderWidth={1}
      borderColor={theme.border}
      borderRadius="8px"
      p={4}
      opacity={isFiltered ? 0.9 : 1}
      borderLeftWidth={isFiltered ? "3px" : "1px"}
      borderLeftColor={isFiltered ? theme.accent : theme.border}
    >
      <VStack align="stretch" spacing={4}>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" w="full">
            <HStack spacing={2}>
              <Heading size="sm" color={theme.textPrimary}>
                {t('activityCalendar')}
              </Heading>
              {isFiltered && (
                <Badge 
                  bg={theme.accent + '20'} 
                  color={theme.accent} 
                  fontSize="xs"
                  borderRadius="full"
                >
                  {t('filtered')}
                </Badge>
              )}
            </HStack>
            <Text fontSize="xs" color={theme.textSecondary}>
              {selectedYear === currentYear ? `${selectedYear} (${t('currentYear')})` : selectedYear}
            </Text>
          </HStack>
          
          {/* Year Navigation Tabs */}
          {availableYears.length > 1 && (
            <HStack spacing={1} wrap="wrap">
              {availableYears.map(year => (
                <Button
                  key={year}
                  size="xs"
                  variant={year === selectedYear ? "solid" : "ghost"}
                  onClick={() => onYearChange(year)}
                  bg={year === selectedYear ? theme.accent : "transparent"}
                  color={year === selectedYear ? theme.bg : theme.textSecondary}
                  _hover={{
                    bg: year === selectedYear ? theme.accent : theme.bgSecondary,
                    color: year === selectedYear ? theme.bg : theme.textPrimary
                  }}
                  borderRadius="4px"
                  px={2}
                  py={1}
                  h="auto"
                  fontSize="xs"
                  fontWeight={year === selectedYear ? "medium" : "normal"}
                >
                  {year}
                </Button>
              ))}
            </HStack>
          )}
        </VStack>
        
        <Box overflow="auto" w="full">
          {/* Centered container for the heatmap */}
          <VStack spacing={2} align="center">
            {/* Month labels positioned above their corresponding weeks */}
            <HStack spacing={1} fontSize="xs" color={theme.textSecondary} h="14px" align="flex-end">
              <Box w="27px" /> {/* Space for day labels */}
              {weeks.map((week, weekIdx) => {
                const monthLabel = monthLabels.find(m => m.position === weekIdx);
                return (
                  <Box key={weekIdx} w="11px" position="relative" h="100%">
                    {monthLabel && (
                      <Text
                        position="absolute"
                        left="0"
                        fontSize="10px"
                        whiteSpace="nowrap"
                        color={theme.textSecondary}
                      >
                        {monthLabel.label}
                      </Text>
                    )}
                  </Box>
                );
              })}
            </HStack>
            
            {/* Calendar grid */}
            <VStack spacing={1} align="start">
              {[t('daySun'), t('dayMon'), t('dayTue'), t('dayWed'), t('dayThu'), t('dayFri'), t('daySat')].map((day, dayIdx) => (
                <HStack key={day} spacing={1}>
                  <Text fontSize="xs" color={theme.textSecondary} w="27px" textAlign="right">
                    {/* Show Mon, Wed, Fri labels only */}
                    {dayIdx === 1 || dayIdx === 3 || dayIdx === 5 ? day : ''}
                  </Text>
                  {weeks.map((week, weekIdx) => (
                    <Tooltip
                      key={weekIdx}
                      label={week[dayIdx] ? getTooltipText(week[dayIdx]) : ''}
                      placement="top"
                      fontSize="sm"
                    >
                      <Box
                        w="11px"
                        h="11px"
                        borderRadius="2px"
                        bg={week[dayIdx] ? getActivityColor(getActivityLevel(week[dayIdx])) : 'transparent'}
                        border="1px solid"
                        borderColor={theme.border}
                        cursor="pointer"
                        _hover={{ 
                          borderColor: theme.textSecondary,
                          transform: 'scale(1.1)' 
                        }}
                        transition="all 0.2s"
                      />
                    </Tooltip>
                  ))}
                </HStack>
              ))}
            </VStack>
            
            {/* Legend */}
            <HStack mt={3} spacing={2} fontSize="xs" color={theme.textSecondary}>
              <Text>{t('less')}</Text>
              {[0, 1, 2, 3, 4].map(level => (
                <Box
                  key={level}
                  w="11px"
                  h="11px"
                  borderRadius="2px"
                  bg={getActivityColor(level)}
                  border="1px solid"
                  borderColor={theme.border}
                />
              ))}
              <Text>{t('more')}</Text>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

const StatisticsManager: React.FC<StatisticsManagerProps> = ({ className, onEditCard }) => {
  const [heatMapData, setHeatMapData] = useState<HeatMapData | null>(null);
  const [streakData, setStreakData] = useState<StreakInfo | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics | null>(null);
  const [backlogInfo, setBacklogInfo] = useState<BacklogInfo | null>(null);
  const [problematicCards, setProblematicCards] = useState<ProblematicCard[]>([]);
  const [timeWasters, setTimeWasters] = useState<TimeWaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('12');
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Load saved tag filters from localStorage on mount
  useEffect(() => {
    const savedTagNames = localStorage.getItem('statistics-tag-filter');
    if (savedTagNames) {
      try {
        const parsedTagNames = JSON.parse(savedTagNames);
        if (Array.isArray(parsedTagNames)) {
          setSelectedTagNames(parsedTagNames);
        }
      } catch (error) {
        console.warn('Failed to parse saved tag filter from localStorage:', error);
      }
    }
  }, []);

  // Save tag filters to localStorage when they change
  useEffect(() => {
    localStorage.setItem('statistics-tag-filter', JSON.stringify(selectedTagNames));
  }, [selectedTagNames]);

  // Load available years on mount
  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [timeRange, selectedTagNames, selectedYear]);

  const loadAvailableYears = async () => {
    try {
      const yearsResult = await StatisticsAPI.getAvailableYears();
      if (yearsResult.success && yearsResult.data) {
        setAvailableYears(yearsResult.data);
        
        // Set default selected year (current year if available, otherwise most recent)
        const currentYear = new Date().getFullYear();
        const defaultYear = yearsResult.data.includes(currentYear) 
          ? currentYear 
          : (yearsResult.data.length > 0 ? yearsResult.data[0] : currentYear);
        setSelectedYear(defaultYear);
      }
    } catch (error) {
      console.error('Failed to load available years:', error);
      // Keep default current year if loading fails
    }
  };

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range based on selected year
      const currentYear = new Date().getFullYear();
      const startDate = new Date(selectedYear, 0, 1); // January 1st of selected year
      const endDate = selectedYear === currentYear 
        ? new Date() // If current year, show up to today
        : new Date(selectedYear, 11, 31); // Otherwise show full year

      const [
        heatMapResult, 
        streakResult, 
        performanceResult,
        backlogResult,
        problematicCardsResult,
        timeWastersResult
      ] = await Promise.all([
        StatisticsAPI.getHeatMapData(startDate, endDate, selectedTagNames.length > 0 ? selectedTagNames : undefined),
        StatisticsAPI.getStreakInfo(), // Streak remains unfiltered (global)
        StatisticsAPI.getPerformanceMetrics(selectedTagNames.length > 0 ? selectedTagNames : undefined),
        StatisticsAPI.getBacklogInfo(selectedTagNames.length > 0 ? selectedTagNames : undefined, 1),
        StatisticsAPI.getProblematicCards(selectedTagNames.length > 0 ? selectedTagNames : undefined, 5),
        StatisticsAPI.getTopTimeWasters(5)
      ]);

      if (heatMapResult.success && heatMapResult.data) {
        setHeatMapData(heatMapResult.data);
      }

      if (streakResult.success && streakResult.data) {
        setStreakData(streakResult.data);
      }

      if (performanceResult.success && performanceResult.data) {
        setPerformanceData(performanceResult.data);
      }

      if (backlogResult.success && backlogResult.data) {
        setBacklogInfo(backlogResult.data);
      }

      if (problematicCardsResult.success && problematicCardsResult.data) {
        setProblematicCards(problematicCardsResult.data);
      }

      if (timeWastersResult.success && timeWastersResult.data) {
        setTimeWasters(timeWastersResult.data);
      }

    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError('Failed to load statistics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box className={className} p={6} bg={theme.bg} minH="100vh">
        <VStack spacing={6} align="stretch">
          <HStack justify="space-between" align="center">
            <Skeleton height="32px" width="200px" />
            <Skeleton height="40px" width="120px" />
          </HStack>
          
          <Skeleton height="300px" borderRadius="lg" />
          
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            <Skeleton height="250px" borderRadius="lg" />
            <Skeleton height="250px" borderRadius="lg" />
          </SimpleGrid>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={className} p={6} bg={theme.bg} minH="100vh">
        <Alert status="error" borderRadius="lg" bg={theme.bgSecondary} border="1px solid" borderColor={theme.danger}>
          <AlertIcon color={theme.danger} />
          <Box>
            <AlertTitle color={theme.textPrimary}>{t('errorLoadingStats')}</AlertTitle>
            <AlertDescription color={theme.textSecondary}>{error}</AlertDescription>
          </Box>
          <Button ml="auto" onClick={loadStatistics} size="sm" colorScheme="red">
            {t('retry')}
          </Button>
        </Alert>
      </Box>
    );
  }

  // Calculate additional helpful stats
  const totalMinutesStudied = performanceData?.overall?.totalStudyTime 
    ? Math.round(performanceData.overall.totalStudyTime / 60000) 
    : 0;

  return (
    <Box className={className} p={6} bg={theme.bg} minH="100vh">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <VStack align="stretch" spacing={4}>
          {/* Header with fixed layout to prevent jumping */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={4} minH="40px">
            <VStack align="start" spacing={2}>
              <Heading size="lg" color={theme.textPrimary}>
                {t('learningStatistics')}
              </Heading>
              {/* Filter Status Indicator */}
              {selectedTagNames.length > 0 && (
                <HStack spacing={2}>
                  <Badge 
                    bg={theme.accent} 
                    color={theme.bg} 
                    fontSize="xs" 
                    px={2} 
                    py={1}
                    borderRadius="full"
                  >
                    {t('filteredByTags', [String(selectedTagNames.length), selectedTagNames.length > 1 ? 's' : ''])}
                  </Badge>
                  <Button
                    size="xs"
                    variant="ghost"
                    color={theme.accent}
                    onClick={() => setSelectedTagNames([])}
                    _hover={{ bg: theme.bgSecondary }}
                  >
                    {t('clearFilters')}
                  </Button>
                </HStack>
              )}
            </VStack>
            
            <HStack spacing={3} flexShrink={0}>
              {/* Tag Filter */}
              <TagFilter
                selectedTagNames={selectedTagNames}
                onTagsChange={setSelectedTagNames}
              />
              
              {/* Time Range Selector */}
              <HStack spacing={2} flexShrink={0}>
                <Text fontSize="sm" color={theme.textSecondary} whiteSpace="nowrap">{t('time')}:</Text>
                <Select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(e.target.value)} 
                  size="sm"
                  w="100px"
                  bg={theme.bgTertiary}
                  borderColor={theme.border}
                  color={theme.textPrimary}
                  borderRadius="6px"
                  _hover={{ borderColor: theme.textSecondary }}
                >
                  <option value="1">{t('1m')}</option>
                  <option value="3">{t('3m')}</option>
                  <option value="6">{t('6m')}</option>
                  <option value="12">{t('1y')}</option>
                </Select>
              </HStack>
            </HStack>
          </Flex>
        </VStack>

        {/* Activity Heat Map */}
        {heatMapData && Object.keys(heatMapData).length > 0 && (
          <HeatMap 
            data={heatMapData} 
            isFiltered={selectedTagNames.length > 0} 
            selectedYear={selectedYear}
            availableYears={availableYears}
            onYearChange={setSelectedYear}
          />
        )}

        {/* Main Content: 2-column layout */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Left Column */}
          <VStack spacing={6} align="stretch">
            {/* Streak & Today Module */}
            <Box
              bg={theme.bgTertiary}
              borderWidth={1}
              borderColor={theme.border}
              borderRadius="8px"
              p={4}
            >
              <VStack align="start" spacing={4}>
                <Heading size="sm" color={theme.textPrimary}>
                  {t('streakAndToday')}
                </Heading>
                
                <VStack align="start" spacing={3} w="full">
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color={theme.textSecondary}>{t('currentStreak')}</Text>
                    <Badge 
                      bg={streakData?.streakActive ? theme.success : theme.textTertiary}
                      color="white"
                      px={2}
                      borderRadius="md"
                    >
                      {streakData?.currentStreak || 0} {i18n.getPlural('day', streakData?.currentStreak || 0)}
                    </Badge>
                  </HStack>
                  
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color={theme.textSecondary}>{t('bestStreak')}</Text>
                    <Text fontSize="sm" fontWeight="bold" color={theme.textPrimary}>
                      {streakData?.bestStreak || 0} {i18n.getPlural('day', streakData?.bestStreak || 0)}
                    </Text>
                  </HStack>
                  
                  {/* Weekly View */}
                  {streakData?.weeklyDays && (
                    <Box w="full">
                      <Text fontSize="xs" color={theme.textTertiary} mb={2}>{t('currentWeek')}</Text>
                      <HStack spacing={1} justify="space-between" w="full">
                        {streakData.weeklyDays.map((day, idx) => (
                          <VStack key={idx} spacing={1} flex={1}>
                            <Text fontSize="xs" color={theme.textTertiary}>
                              {translateDayName(day.dayName)}
                            </Text>
                            <Box
                              w="32px"
                              h="32px"
                              borderRadius="md"
                              bg={day.completed ? theme.success : (day.isToday ? theme.warning + '40' : theme.border)}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              borderWidth={day.isToday ? 2 : 0}
                              borderColor={day.isToday ? theme.accent : 'transparent'}
                            >
                              {day.completed ? (
                                <Text fontSize="lg">✓</Text>
                              ) : day.isToday ? (
                                <Text fontSize="xs" color={theme.textSecondary}>{day.qualityCards}</Text>
                              ) : (
                                <Text fontSize="lg" color={theme.textTertiary}>-</Text>
                              )}
                            </Box>
                          </VStack>
                        ))}
                      </HStack>
                    </Box>
                  )}
                  
                  {streakData && streakData.currentStreak > 0 && streakData.bestStreak > streakData.currentStreak && (
                    <Box w="full">
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="xs" color={theme.textTertiary}>{t('progressToBeat')}</Text>
                        <Text fontSize="xs" color={theme.textTertiary}>
                          {t('daysToGo', String(streakData.bestStreak - streakData.currentStreak))}
                        </Text>
                      </HStack>
                      <Box
                        w="full"
                        h="8px"
                        bg={theme.border}
                        borderRadius="full"
                        overflow="hidden"
                      >
                        <Box
                          h="full"
                          bg={theme.success}
                          borderRadius="full"
                          width={`${(streakData.currentStreak / streakData.bestStreak) * 100}%`}
                          transition="width 0.3s ease"
                        />
                      </Box>
                    </Box>
                  )}

                  {/* Today's Progress */}
                  {streakData?.todayProgress && (
                    <Box w="full">
                      <VStack align="start" spacing={2} w="full">
                        <HStack justify="space-between" w="full">
                          <Text fontSize="xs" fontWeight="medium" color={theme.textSecondary}>
                            {t('todaysGoal')}
                          </Text>
                          <Text fontSize="xs" fontWeight="bold" color={
                            streakData.todayProgress.cardsAnswered >= streakData.todayProgress.dailyGoal 
                              ? theme.success 
                              : theme.warning
                          }>
                            {streakData.todayProgress.cardsAnswered}/{streakData.todayProgress.dailyGoal}
                          </Text>
                        </HStack>
                        <Box
                          w="full"
                          h="4px"
                          bg={theme.border}
                          borderRadius="2px"
                          overflow="hidden"
                        >
                          <Box
                            h="full"
                            bg={streakData.todayProgress.cardsAnswered >= streakData.todayProgress.dailyGoal ? theme.success : theme.warning}
                            borderRadius="2px"
                            width={`${Math.min((streakData.todayProgress.cardsAnswered / streakData.todayProgress.dailyGoal) * 100, 100)}%`}
                            transition="width 0.3s ease"
                          />
                        </Box>
                        
                        {/* Protect Streak CTA */}
                        {streakData.currentStreak > 0 && streakData.todayProgress.cardsNeeded > 0 && (
                          <Box w="full" p={2} bg={theme.warning + '20'} borderRadius="md">
                            <Text fontSize="xs" color={theme.warning} fontWeight="medium">
                              {t('protectStreak', [String(streakData.todayProgress.cardsNeeded), streakData.todayProgress.cardsNeeded !== 1 ? 's' : '', String(streakData.currentStreak)])}
                            </Text>
                          </Box>
                        )}
                        
                        {/* Streak Safe Message */}
                        {streakData.todayProgress.cardsAnswered >= streakData.todayProgress.dailyGoal && (
                          <Box w="full" p={2} bg={theme.success + '20'} borderRadius="md">
                            <Text fontSize="xs" color={theme.success}>
                              ✅ {t('streakSafeMessage', [String(streakData.daysUntilStreakBreak), streakData.daysUntilStreakBreak !== 1 ? 's' : ''])}
                            </Text>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  )}
                </VStack>
              </VStack>
            </Box>

            {/* Backlog & Projection Module */}
            <Box
              bg={theme.bgTertiary}
              borderWidth={1}
              borderColor={theme.border}
              borderRadius="8px"
              p={4}
              borderLeftWidth={selectedTagNames.length > 0 ? "3px" : "1px"}
              borderLeftColor={selectedTagNames.length > 0 ? theme.accent : theme.border}
            >
              <VStack align="start" spacing={4}>
                <HStack justify="space-between" w="full">
                  <Heading size="sm" color={theme.textPrimary}>
                    {t('backlogProjection')}
                  </Heading>
                  {selectedTagNames.length > 0 && (
                    <Badge 
                      bg={theme.accent + '20'} 
                      color={theme.accent} 
                      fontSize="xs"
                      borderRadius="full"
                    >
                      {t('filtered')}
                    </Badge>
                  )}
                </HStack>
                
                {backlogInfo ? (
                  <VStack align="start" spacing={3} w="full">
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color={theme.textSecondary}>{t('dueCards')}</Text>
                      <Badge 
                        bg={backlogInfo.backlogCount > 0 ? theme.warning + '30' : theme.success + '30'}
                        color={backlogInfo.backlogCount > 0 ? theme.warning : theme.success}
                        px={2}
                        borderRadius="md"
                      >
                        {backlogInfo.backlogCount}
                      </Badge>
                    </HStack>
                    
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color={theme.textSecondary}>{t('recentPace')}</Text>
                      <Text fontSize="sm" fontWeight="bold" color={theme.textPrimary}>
                        {backlogInfo.recentPace} {t('perDay')}
                      </Text>
                    </HStack>
                    
                    <HStack justify="space-between" w="full">
                      <Text fontSize="sm" color={theme.textSecondary}>{t('daysToClear')}</Text>
                      <Text fontSize="sm" fontWeight="bold" color={theme.textPrimary}>
                        {backlogInfo.daysToClear === 999 ? '∞' : backlogInfo.daysToClear}
                      </Text>
                    </HStack>
                    
                    {backlogInfo.backlogCount > 0 && (
                      <Box w="full" p={3} bg={theme.primaryGreen + '20'} borderRadius="md">
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="medium" color={theme.primaryGreen}>
                            {t('todaysPlan')}
                          </Text>
                          <Text fontSize="xs" color={theme.textSecondary}>
                            {t('studyCardsOnTrack', String(backlogInfo.todaysPlan))}
                          </Text>
                        </VStack>
                      </Box>
                    )}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color={theme.textSecondary}>
                    {t('noBacklogDataAvailable')}
                  </Text>
                )}
              </VStack>
            </Box>
          </VStack>

          {/* Right Column */}
          <VStack spacing={6} align="stretch">
            {/* Problematic Cards Module */}
            <Box
              bg={theme.bgTertiary}
              borderWidth={1}
              borderColor={theme.border}
              borderRadius="8px"
              p={4}
              borderLeftWidth={selectedTagNames.length > 0 ? "3px" : "1px"}
              borderLeftColor={selectedTagNames.length > 0 ? theme.accent : theme.border}
            >
              <VStack align="start" spacing={4}>
                <HStack justify="space-between" w="full">
                  <Heading size="sm" color={theme.textPrimary}>
                    {t('problematicCards')}
                  </Heading>
                  {selectedTagNames.length > 0 && (
                    <Badge 
                      bg={theme.accent + '20'} 
                      color={theme.accent} 
                      fontSize="xs"
                      borderRadius="full"
                    >
                      {t('filtered')}
                    </Badge>
                  )}
                </HStack>
                
                {problematicCards.length > 0 ? (
                  <VStack align="start" spacing={3} w="full">
                    {problematicCards.map((card, idx) => {
                      const issueLabels = {
                        high_again: { text: t('highAgain'), color: theme.danger },
                        high_hard: { text: t('highHard'), color: theme.warning },
                        low_ease: { text: t('lowEase'), color: theme.warning },
                        ease_drop: { text: t('easeDrop'), color: theme.warning }
                      };
                      const issue = issueLabels[card.issue];
                      
                      return (
                        <Box 
                          key={card.cardId} 
                          w="full" 
                          p={3} 
                          bg={theme.bgSecondary} 
                          borderRadius="md"
                          borderWidth={1}
                          borderColor={theme.border}
                        >
                          <VStack align="start" spacing={2}>
                            <HStack justify="space-between" w="full">
                              <HStack spacing={2}>
                                <Badge 
                                  bg={issue.color + '30'}
                                  color={issue.color}
                                  fontSize="xs"
                                  borderRadius="md"
                                >
                                  {issue.text}
                                </Badge>
                                <Text fontSize="xs" color={theme.textTertiary}>
                                  {card.reviewCount} {t('reviews')}
                                </Text>
                              </HStack>
                              {onEditCard && (
                                <Tooltip label={t('editCard')} fontSize="xs" placement="top">
                                  <IconButton
                                    aria-label={t('editCard')}
                                    icon={<EditIcon />}
                                    size="xs"
                                    variant="ghost"
                                    color={theme.textSecondary}
                                    _hover={{ 
                                      color: theme.accent, 
                                      bg: theme.accent + '20' 
                                    }}
                                    onClick={() => onEditCard(card.cardId)}
                                  />
                                </Tooltip>
                              )}
                            </HStack>
                            <Text fontSize="sm" color={theme.textPrimary} noOfLines={2}>
                              {card.title}
                            </Text>
                            <HStack spacing={2} wrap="wrap">
                              {card.tags.slice(0, 3).map(tag => (
                                <Badge 
                                  key={tag}
                                  bg={theme.secondaryBlue + '20'}
                                  color={theme.secondaryBlue}
                                  fontSize="xs"
                                  borderRadius="md"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {card.tags.length > 3 && (
                                <Text fontSize="xs" color={theme.textTertiary}>
                                  {t('moreTag', String(card.tags.length - 3))}
                                </Text>
                              )}
                            </HStack>
                          </VStack>
                        </Box>
                      );
                    })}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color={theme.textSecondary}>
                    {t('noProblematicCardsGreat')}
                  </Text>
                )}
              </VStack>
            </Box>

            {/* Top Time-wasters Module */}
            <Box
              bg={theme.bgTertiary}
              borderWidth={1}
              borderColor={theme.border}
              borderRadius="8px"
              p={4}
            >
              <VStack align="start" spacing={4}>
                <Heading size="sm" color={theme.textPrimary}>
                  {t('topTimeWasters30d')}
                </Heading>
                
                {timeWasters.length > 0 ? (
                  <VStack align="start" spacing={3} w="full">
                    {timeWasters.map((tw, idx) => (
                      <Box 
                        key={tw.domain} 
                        w="full" 
                        p={3} 
                        bg={theme.bgSecondary} 
                        borderRadius="md"
                        borderWidth={1}
                        borderColor={theme.border}
                      >
                        <VStack align="start" spacing={2}>
                          <HStack justify="space-between" w="full">
                            <Text fontSize="sm" fontWeight="bold" color={theme.textPrimary} isTruncated maxW="60%">
                              {tw.domain}
                            </Text>
                            <Badge 
                              bg={theme.danger + '30'}
                              color={theme.danger}
                              fontSize="xs"
                              borderRadius="md"
                            >
                              {tw.last30Days} {t('blocks')}
                            </Badge>
                          </HStack>
                          <HStack justify="space-between" w="full">
                            <Text fontSize="xs" color={theme.textSecondary}>
                              {tw.averageDailyBlocks} {t('perDay')}
                            </Text>
                            <Text fontSize="xs" color={theme.textSecondary}>
                              {tw.cooldownPeriod}{t('minCooldown')}
                            </Text>
                          </HStack>
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color={theme.textSecondary}>
                    {t('noRecentBlocksFound')}
                  </Text>
                )}
              </VStack>
            </Box>
          </VStack>
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default StatisticsManager; 