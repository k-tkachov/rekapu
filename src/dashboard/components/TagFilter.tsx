import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Flex,
  Text,
  Button,
  Input,
  Checkbox,
  Badge,
  Icon
} from '@chakra-ui/react';
import { ChevronDownIcon, SmallCloseIcon } from '@chakra-ui/icons';
import { t } from '../../utils/i18n';
import { 
  loadAvailableTags, 
  filterTagsBySearch, 
  toggleTagSelection, 
  removeTagFromSelection, 
  clearAllTags,
  createTagFilterPersistence 
} from '../../utils/tagFilterUtils';

interface TagFilterProps {
  selectedTagNames: string[];
  onTagsChange: (tagNames: string[]) => void;
  className?: string;
}

// Theme colors matching StatisticsManager exactly
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

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTagNames,
  onTagsChange,
  className
}) => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const persistence = createTagFilterPersistence();

  // Load available tags
  useEffect(() => {
    loadTagsData();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const loadTagsData = async () => {
    try {
      setLoading(true);
      const tags = await loadAvailableTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = filterTagsBySearch(availableTags, searchTerm);

  const handleTagToggle = (tagName: string) => {
    const newSelection = toggleTagSelection(selectedTagNames, tagName);
    onTagsChange(newSelection);
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newSelection = clearAllTags();
    onTagsChange(newSelection);
  };

  const hasSelectedTags = selectedTagNames.length > 0;

  return (
    <Box className={className} position="relative">
      {/* Filter Button - Match Select component styling exactly */}
      <Box ref={containerRef}>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          w="140px"
          justifyContent="space-between"
          bg={theme.bgTertiary}
          borderColor={theme.border}
          color={theme.textPrimary}
          borderRadius="6px"
          _hover={{ borderColor: theme.textSecondary }}
          rightIcon={<ChevronDownIcon w={4} h={4} />}
          isLoading={loading}
          loadingText={t('loading')}
        >
          <Text isTruncated>
            {hasSelectedTags ? t('tagsCount', [String(selectedTagNames.length)]) : t('filterTags')}
          </Text>
        </Button>
      </Box>

      {/* Dropdown - Relative positioning to avoid scroll issues */}
      {isOpen && (
        <Box
          ref={dropdownRef}
          position="absolute"
          top="100%"
          left="0"
          w="300px"
          maxH="320px"
          bg={theme.bgTertiary}
          borderWidth={1}
          borderColor={theme.border}
          borderRadius="6px"
          boxShadow="lg"
          overflow="hidden"
          zIndex={1000}
          mt={1}
        >
              <VStack align="stretch" spacing={0}>
                {/* Header with Clear All */}
                <Flex justify="space-between" align="center" p={3} borderBottomWidth={1} borderBottomColor={theme.border}>
                  <Text fontSize="sm" fontWeight="medium" color={theme.textPrimary}>
                    {t('filterByTags')}
                  </Text>
                  {hasSelectedTags && (
                    <Button
                      size="xs"
                      variant="ghost"
                      color={theme.textSecondary}
                      _hover={{ color: theme.danger }}
                      onClick={handleClearAll}
                    >
                      {t('clearAll')}
                    </Button>
                  )}
                </Flex>

                {/* Selected Tags Display */}
                {hasSelectedTags && (
                  <Box p={3} borderBottomWidth={1} borderBottomColor={theme.border}>
                    <Text fontSize="xs" color={theme.textSecondary} mb={2}>
                      {t('selectedCount', [String(selectedTagNames.length)])}
                    </Text>
                    <Flex wrap="wrap" gap={1}>
                      {selectedTagNames.map(tagName => (
                        <Badge
                          key={tagName}
                          bg={theme.secondaryBlue + '20'}
                          color={theme.secondaryBlue}
                          fontSize="xs"
                          px={2}
                          py={1}
                          borderRadius="4px"
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          {tagName}
                          <Icon
                            as={SmallCloseIcon}
                            w={3}
                            h={3}
                            cursor="pointer"
                            _hover={{ color: theme.danger }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const newSelection = removeTagFromSelection(selectedTagNames, tagName);
                              onTagsChange(newSelection);
                            }}
                          />
                        </Badge>
                      ))}
                    </Flex>
                  </Box>
                )}

                {/* Search */}
                <Box p={3} borderBottomWidth={1} borderBottomColor={theme.border}>
                  <Input
                    placeholder={t('searchTagsPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="sm"
                    bg={theme.bgSecondary}
                    borderColor={theme.border}
                    color={theme.textPrimary}
                    borderRadius="6px"
                    _placeholder={{ color: theme.textTertiary }}
                    _focus={{ borderColor: theme.secondaryBlue }}
                  />
                </Box>

                {/* Tag List */}
                <Box maxH="200px" overflowY="auto">
                  {filteredTags.length === 0 ? (
                    <Box p={4} textAlign="center">
                      <Text fontSize="sm" color={theme.textSecondary}>
                        {searchTerm ? t('noTagsMatchSearch') : t('noTagsAvailable')}
                      </Text>
                    </Box>
                  ) : (
                    filteredTags.map(tagName => (
                      <Box
                        key={tagName}
                        p={3}
                        cursor="pointer"
                        _hover={{ bg: theme.bgSecondary }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleTagToggle(tagName);
                        }}
                      >
                        <HStack spacing={3}>
                          <Checkbox
                            isChecked={selectedTagNames.includes(tagName)}
                            onChange={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleTagToggle(tagName);
                            }}
                            colorScheme="blue"
                            size="sm"
                          />
                          <Flex align="center" gap={2} flex={1}>
                            <Box
                              w={3}
                              h={3}
                              borderRadius="full"
                              bg={theme.accent}
                            />
                            <Text fontSize="sm" color={theme.textPrimary}>
                              {tagName}
                            </Text>
                          </Flex>
                        </HStack>
                      </Box>
                    ))
                  )}
                </Box>
              </VStack>
        </Box>
      )}
    </Box>
  );
};

export default TagFilter;