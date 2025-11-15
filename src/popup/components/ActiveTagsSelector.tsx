import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Checkbox,
  Badge,
  Wrap,
  WrapItem,
  useToast,
  Spinner,
  Center,
  FormControl,
  FormLabel,
  FormHelperText,
  Divider,
} from '@chakra-ui/react';
import { Tag, Card } from '../../types';
import { StorageAPI } from '../../storage/StorageAPI';
import { getTagColor } from '../../utils/tagColors';
import { t } from '../../utils/i18n';

interface ActiveTagsSelectorProps {
  refreshTrigger?: number;
}

interface TagWithCount {
  name: string;
  color: string;
  count: number;
  isActive: boolean;
}

export const ActiveTagsSelector: React.FC<ActiveTagsSelectorProps> = ({
  refreshTrigger,
}) => {
  const [tagsWithCounts, setTagsWithCounts] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadTagsAndCounts();
  }, [refreshTrigger]);

  const loadTagsAndCounts = async () => {
    setLoading(true);
    try {
      // Load tags from tags table (source of truth)
      const [tagsResult, cardsResult, activeTagsResult] = await Promise.all([
        StorageAPI.getAllTags(),
        StorageAPI.getAllCards(),
        StorageAPI.getActiveTags(),
      ]);

      const tags = tagsResult.success ? Object.values(tagsResult.data || {}) : [];
      const cards = cardsResult.success ? Object.values(cardsResult.data || {}) : [];
      const activeTags = activeTagsResult.success ? activeTagsResult.data || [] : [];

      // Build a map with tags from tags table
      const tagInfoMap = new Map<string, TagWithCount>();

      // Initialize with formal tags (source of truth)
      tags.forEach(tag => {
        tagInfoMap.set(tag.name, {
          name: tag.name,
          color: tag.color || getTagColor(tag.name),
          count: 0,
          isActive: activeTags.includes(tag.name),
        });
      });

      // Count cards for each tag
      cards.forEach(card => {
        card.tags.forEach(tagName => {
          const existing = tagInfoMap.get(tagName);
          if (existing) {
            existing.count++;
          }
        });
      });

      // Convert to array and sort by name
      const tagsList = Array.from(tagInfoMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );

      setTagsWithCounts(tagsList);

      // If no active tags are set and tags exist, activate all tags by default
      if (activeTags.length === 0 && tagsList.length > 0) {
        const allTagNames = tagsList.map(tag => tag.name);
        await StorageAPI.setActiveTags(allTagNames);
        
        // Update the local state to reflect all tags as active
        setTagsWithCounts(prev => prev.map(tag => ({ ...tag, isActive: true })));
      }
      
    } catch (error) {
      console.error('Failed to load tags:', error);
      toast({
        title: 'Error Loading Tags',
        description: 'Failed to load tag information',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = async (tagName: string, isActive: boolean) => {
    setUpdating(tagName);
    try {
      let result;
      
      if (isActive) {
        result = await StorageAPI.addActiveTag(tagName);
      } else {
        // Prevent deactivating the last active tag
        const activeCount = tagsWithCounts.filter(tag => tag.isActive).length;
        if (activeCount <= 1) {
          toast({
            title: t('cannotDeactivate'),
            description: t('atLeastOneTagActive'),
            status: 'warning',
            duration: 3000,
          });
          setUpdating(null);
          return;
        }
        
        result = await StorageAPI.removeActiveTag(tagName);
      }

      // Check if the storage operation succeeded
      if (result.success) {
        // Update local state only if storage operation succeeded
        setTagsWithCounts(prev => prev.map(tag => 
          tag.name === tagName ? { ...tag, isActive } : tag
        ));
      } else {
        // Storage operation failed - show error and reload from storage
        console.error('Storage operation failed:', result.error);
        toast({
          title: 'Update Failed',
          description: result.error || 'Failed to update tag activation',
          status: 'error',
          duration: 3000,
        });
        
        // Reload tags from storage to ensure UI reflects actual state
        await loadTagsAndCounts();
      }

    } catch (error) {
      console.error('Failed to update active tag:', error);
      toast({
        title: t('updateFailed'),
        description: t('failedToUpdateTagActivation'),
        status: 'error',
        duration: 3000,
      });
      
      // Reload tags from storage to ensure UI reflects actual state
      await loadTagsAndCounts();
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Center py={4}>
        <VStack spacing={2}>
          <Spinner color="#8AB4F8" size="sm" />
          <Text color="#9aa0a6" fontSize="xs">Loading tags...</Text>
        </VStack>
      </Center>
    );
  }

  if (tagsWithCounts.length === 0) {
    return (
      <Box p={4} bg="#292a2d" borderRadius="md" borderWidth={1} borderColor="#3c4043">
        <VStack spacing={2} textAlign="center">
          <Text color="#e8eaed" fontSize="sm" fontWeight="medium">
            No Tags Available
          </Text>
          <Text color="#9aa0a6" fontSize="xs">
            Create some cards with tags to enable filtered study sessions
          </Text>
        </VStack>
      </Box>
    );
  }

  const activeCount = tagsWithCounts.filter(tag => tag.isActive).length;

  return (
    <FormControl>
      <FormLabel color="#e8eaed" fontSize="sm" fontWeight="medium">
        {t('activeStudyTags')}
      </FormLabel>
      
      <Box p={4} bg="#292a2d" borderRadius="md" borderWidth={1} borderColor="#3c4043">
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between">
            <Text color="#9aa0a6" fontSize="xs">
              {t('selectSubjectsForCards')}
            </Text>
            <Badge colorScheme="blue" variant="subtle" fontSize="xs">
              {t('xOfXActive', [String(activeCount), String(tagsWithCounts.length)])}
            </Badge>
          </HStack>

          <Divider borderColor="#3c4043" />

          <Wrap spacing={2}>
            {tagsWithCounts.map((tag) => (
              <WrapItem key={tag.name}>
                <HStack spacing={2}>
                  <Checkbox
                    isChecked={tag.isActive}
                    onChange={(e) => handleTagToggle(tag.name, e.target.checked)}
                    isDisabled={updating === tag.name}
                    colorScheme="green"
                    size="sm"
                  >
                    <HStack spacing={1}>
                      <Box
                        w={2}
                        h={2}
                        bg={tag.color}
                        borderRadius="full"
                      />
                      <Text fontSize="sm" color="#e8eaed">
                        {tag.name}
                      </Text>
                      <Badge variant="subtle" fontSize="xs" colorScheme="gray">
                        {tag.count}
                      </Badge>
                    </HStack>
                  </Checkbox>
                </HStack>
              </WrapItem>
            ))}
          </Wrap>
        </VStack>
      </Box>

      <FormHelperText color="#9aa0a6" fontSize="xs" mt={2}>
        {t('whenBlockedOnlyActiveTags')}
      </FormHelperText>
    </FormControl>
  );
}; 