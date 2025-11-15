import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  useToast,
  Center,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  Tooltip,
  Switch,
} from '@chakra-ui/react';
import {
  EditIcon,
  DeleteIcon,
  SearchIcon,
} from '@chakra-ui/icons';
import { StorageAPI } from '../../storage/StorageAPI';
import { formatDueBadge, getEffectiveDueDate } from '../../utils/dateUtils';
import { Card } from '../../types';
import { AdvancedPagination } from './AdvancedPagination';
import { t, i18n } from '../../utils/i18n';

const truncateText = (text: string, maxLength: number = 60) => {
  const cleanText = text.replace(/[#*_`]/g, '').trim();
  return cleanText.length > maxLength ? cleanText.slice(0, maxLength) + '...' : cleanText;
};

const getCardTypeLabel = (type: string) => {
  switch (type) {
    case 'basic': return 'SHOW';
    case 'cloze': return 'CLOZE';
    default: return '?';
  }
};

const getCardTypeColor = (type: string) => {
  switch (type) {
    case 'basic': return '#FCC934';
    case 'cloze': return '#F28B82';
    default: return '#9aa0a6';
  }
};

interface CardRowProps {
  card: Card;
  onEditCard: (card: Card) => void;
  onDeleteClick: (card: Card) => void;
  onDraftToggle: (card: Card) => void;
}

const CardRow = React.memo<CardRowProps>(({ card, onEditCard, onDeleteClick, onDraftToggle }) => {
  const effectiveDueDate = useMemo(() => getEffectiveDueDate(card), [card]);
  const dueInfo = useMemo(() => formatDueBadge(effectiveDueDate), [effectiveDueDate]);
  const typeLabel = useMemo(() => getCardTypeLabel(card.type), [card.type]);
  const typeColor = useMemo(() => getCardTypeColor(card.type), [card.type]);
  const truncatedFront = useMemo(() => truncateText(card.front, 50), [card.front]);
  const truncatedBack = useMemo(() => truncateText(card.back, 50), [card.back]);

  const draftOpacity = card.isDraft ? 0.5 : 1;
  const rowColor = card.isDraft ? "#202124" : "#292a2d";

  return (
    <Tr
      borderColor="#35363a"
      _hover={{ bg: rowColor }}
      transition="background-color 0.1s"
      opacity={draftOpacity}
    >
      <Td py={2} border="none" minW="80px">
        <Badge
          fontSize="xs"
          bg={card.isDraft ? "#9aa0a6" : dueInfo.bg}
          color={card.isDraft ? "#292a2d" : dueInfo.color}
          variant="solid"
          fontWeight="medium"
          px={2}
          py={1}
          opacity={card.isDraft ? 0.7 : 1}
        >
          {card.isDraft ? t('na') : dueInfo.text}
        </Badge>
      </Td>
      <Td py={2} border="none" width="60px" textAlign="center">
        <Tooltip label={card.isDraft ? t('currentlyDraftToggle') : t('currentlyPublishedToggle')} fontSize="xs">
          <Box>
            <Switch
              size="sm"
              isChecked={card.isDraft}
              onChange={() => onDraftToggle(card)}
              colorScheme="orange"
            />
          </Box>
        </Tooltip>
      </Td>
      <Td py={2} border="none" width="50px">
        <Tooltip label={card.type} fontSize="xs">
          <Badge
            fontSize="9px"
            bg={typeColor}
            color="white"
            variant="solid"
            fontWeight="bold"
            px={1.5}
            py={0.5}
            borderRadius="sm"
          >
            {typeLabel}
          </Badge>
        </Tooltip>
      </Td>
      <Td py={2} border="none" maxW="250px">
        <Text
          fontSize="sm"
          color="#e8eaed"
          noOfLines={1}
          cursor="pointer"
          onClick={() => onEditCard(card)}
          _hover={{ color: "#8AB4F8" }}
        >
          {truncatedFront || t('untitled')}
        </Text>
      </Td>
      <Td py={2} border="none" maxW="250px">
        <Text
          fontSize="sm"
          color="#9aa0a6"
          noOfLines={1}
        >
          {truncatedBack || t('noAnswer')}
        </Text>
      </Td>
      <Td py={2} border="none" maxW="150px">
        <Flex wrap="wrap" gap={1}>
          {card.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              size="sm"
              bg="#35363a"
              color="#5f6368"
              fontSize="xs"
              px={1.5}
              py={0.5}
            >
              {tag}
            </Badge>
          ))}
          {card.tags.length > 2 && (
            <Text color="#5f6368" fontSize="xs">
              +{card.tags.length - 2}
            </Text>
          )}
        </Flex>
      </Td>
      <Td py={2} border="none">
        <HStack spacing={1}>
          <IconButton
            aria-label={t('editCard')}
            icon={<EditIcon />}
            size="xs"
            variant="ghost"
            color="#9aa0a6"
            _hover={{ color: "#e8eaed", bg: "#35363a" }}
            onClick={() => onEditCard(card)}
          />
          <IconButton
            aria-label={t('deleteCard')}
            icon={<DeleteIcon />}
            size="xs"
            variant="ghost"
            color="#9aa0a6"
            _hover={{ color: "#F28B82", bg: "rgba(242, 139, 130, 0.1)" }}
            onClick={() => onDeleteClick(card)}
          />
        </HStack>
      </Td>
    </Tr>
  );
});

interface CardsListProps {
  onEditCard: (card: Card) => void;
  refreshTrigger: number;
}

interface PaginatedResult {
  cards: Card[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const CardsList: React.FC<CardsListProps> = ({
  onEditCard,
  refreshTrigger,
}) => {
  const [paginatedData, setPaginatedData] = useState<PaginatedResult>({
    cards: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortBy, setSortBy] = useState<'created' | 'modified' | 'due' | 'front'>('due');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteCard, setDeleteCard] = useState<Card | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const toast = useToast();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const ITEMS_PER_PAGE = 50;

  const loadCards = useCallback(async (
    page: number = currentPage,
    search: string = searchTerm,
    tagFilter: string = selectedTag,
    sortField: typeof sortBy = sortBy,
    sortDirection: typeof sortOrder = sortOrder
  ) => {
    try {
      setLoading(true);

      const result = await StorageAPI.getCardsPaginated({
        page,
        limit: ITEMS_PER_PAGE,
        search: search || undefined,
        tagFilter: tagFilter || undefined,
        sortBy: sortField,
        sortOrder: sortDirection,
      });

      if (result.success && result.data) {
        setPaginatedData(result.data);
        setCurrentPage(result.data.currentPage);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load cards',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Failed to load cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cards',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedTag, sortBy, sortOrder, toast]);

  const loadAllTags = useCallback(async () => {
    try {
      const result = await StorageAPI.getAllUniqueTagNames();
      if (result.success && result.data) {
        setAllTags(result.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }, []);

  useEffect(() => {
    loadCards();
    loadAllTags();
  }, [refreshTrigger, loadCards, loadAllTags]);



  // Handle search
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
    loadCards(1, value, selectedTag, sortBy, sortOrder);
  };

  // Handle filter changes
  const handleTagFilterChange = useCallback((value: string) => {
    setSelectedTag(value);
    setCurrentPage(1);
    loadCards(1, searchTerm, value, sortBy, sortOrder);
  }, [searchTerm, sortBy, sortOrder, loadCards]);

  // Handle sort changes
  const handleSortChange = useCallback((field: typeof sortBy, direction?: typeof sortOrder) => {
    const newSortOrder = direction || (field === sortBy && sortOrder === 'asc' ? 'desc' : 'asc');
    setSortBy(field);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
    loadCards(1, searchTerm, selectedTag, field, newSortOrder);
  }, [sortBy, sortOrder, searchTerm, selectedTag, loadCards]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= paginatedData.totalPages) {
      setCurrentPage(page);
      loadCards(page, searchTerm, selectedTag, sortBy, sortOrder);
    }
  }, [paginatedData.totalPages, searchTerm, selectedTag, sortBy, sortOrder, loadCards]);

  const handleDeleteClick = useCallback((card: Card) => {
    setDeleteCard(card);
    onDeleteOpen();
  }, [onDeleteOpen]);

  const handleDeleteConfirm = async () => {
    if (!deleteCard) return;

    try {
      const result = await StorageAPI.removeCard(deleteCard.id);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Card deleted successfully',
          status: 'success',
          duration: 3000,
        });

        // Reload current page, but handle edge case where we deleted the last item on the last page
        const newTotalCount = paginatedData.totalCount - 1;
        const newTotalPages = Math.ceil(newTotalCount / ITEMS_PER_PAGE);
        const pageToLoad = currentPage > newTotalPages ? Math.max(1, newTotalPages) : currentPage;

        loadCards(pageToLoad);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete card',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setDeleteCard(null);
      onDeleteClose();
    }
  };

  const handleDraftToggle = useCallback(async (card: Card) => {
    try {
      const result = await StorageAPI.updateCard(card.id, {
        isDraft: !card.isDraft,
      });
      
      if (result.success) {
        toast({
          title: card.isDraft ? 'Card published' : 'Card marked as draft',
          description: card.isDraft 
            ? 'Card will now appear in study sessions'
            : 'Card will not appear in study sessions',
          status: 'success',
          duration: 2000,
        });
        
        setPaginatedData(prev => ({
          ...prev,
          cards: prev.cards.map(q => 
            q.id === card.id ? { ...q, isDraft: !q.isDraft } : q
          )
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to toggle draft status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update card status',
        status: 'error',
        duration: 3000,
      });
    }
  }, [toast]);


  // Memoize filter options to prevent unnecessary re-renders
  const tagOptions = useMemo(() =>
    allTags.map(tag => (
      <option key={tag} value={tag}>{tag}</option>
    )),
    [allTags]
  );

  const { cards, totalCount, totalPages, currentPage: currentPageFromData } = paginatedData;

  return (
    <Box>
      {/* Search and Filter Controls */}
      <VStack spacing={4} mb={6}>
        <HStack w="full" spacing={4}>
          <InputGroup flex={1}>
            <InputLeftElement>
              <SearchIcon color="#9aa0a6" />
            </InputLeftElement>
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              bg="#292a2d"
              borderColor="#3c4043"
              color="#e8eaed"
              size="sm"
              name="search"
              _hover={{ borderColor: '#5f6368' }}
              _focus={{
                borderColor: '#8AB4F8',
                boxShadow: '0 0 0 1px #8AB4F8',
              }}
              _placeholder={{ color: '#5f6368' }}
            />
          </InputGroup>

          <Select
            placeholder={t('allTags')}
            value={selectedTag}
            onChange={(e) => handleTagFilterChange(e.target.value)}
            bg="#292a2d"
            borderColor="#3c4043"
            color="#e8eaed"
            maxW="150px"
            size="sm"
            _hover={{ borderColor: '#5f6368' }}
            _focus={{
              borderColor: '#8AB4F8',
              boxShadow: '0 0 0 1px #8AB4F8',
            }}
          >
            {tagOptions}
          </Select>

          <Select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as any, sortOrder)}
            bg="#292a2d"
            borderColor="#3c4043"
            color="#e8eaed"
            maxW="120px"
            size="sm"
            _hover={{ borderColor: '#5f6368' }}
            _focus={{
              borderColor: '#8AB4F8',
              boxShadow: '0 0 0 1px #8AB4F8',
            }}
          >
            <option value="due">{t('dueDate')}</option>
            <option value="front">{t('front')}</option>
            <option value="created">{t('newest')}</option>
            <option value="modified">{t('modified')}</option>
          </Select>
        </HStack>

        <HStack justify="space-between" w="full">
          <Text color="#9aa0a6" fontSize="sm">
            {!!totalCount && t('cardsCount', [String(totalCount), i18n.getPlural('card', totalCount)])}
            {' '}
            {searchTerm || selectedTag ? t('filtered') : ''}
          </Text>

          {(searchTerm || selectedTag) && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setSearchTerm('');
                setSelectedTag('');
              }}
              color="#9aa0a6"
              _hover={{ color: "#e8eaed" }}
            >
              {t('clearFiltersButton')}
            </Button>
          )}
        </HStack>
      </VStack>

      {/* Cards Table */}
      {cards.length === 0 ? (
        <Center h="40vh">
          <VStack spacing={4}>
            <Text color="#9aa0a6" fontSize="lg">
              {totalCount === 0 ? t('noCardsYet') : t('noCardsMatchFilters')}
            </Text>
            <Text color="#5f6368" fontSize="sm" textAlign="center">
              {totalCount === 0
                ? t('createFirstCard')
                : t('tryAdjustingFilters')
              }
            </Text>
          </VStack>
        </Center>
      ) : (
        <TableContainer>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr borderColor="#3c4043">
                <Th color="#9aa0a6" fontSize="xs" py={2} border="none">{t('due')}</Th>
                <Th color="#9aa0a6" fontSize="xs" py={2} border="none" width="60px">{t('draft')}</Th>
                <Th color="#9aa0a6" fontSize="xs" py={2} border="none">{t('type')}</Th>
                <Th color="#9aa0a6" fontSize="xs" py={2} border="none">{t('front')}</Th>
                <Th color="#9aa0a6" fontSize="xs" py={2} border="none">{t('back')}</Th>
                <Th color="#9aa0a6" fontSize="xs" py={2} border="none">{t('tags')}</Th>
                <Th color="#9aa0a6" fontSize="xs" py={2} border="none" width="80px">{t('actions')}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {cards.map((card) => (
                <CardRow 
                  key={card.id} 
                  card={card}
                  onEditCard={onEditCard}
                  onDeleteClick={handleDeleteClick}
                  onDraftToggle={handleDraftToggle}
                />
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination Controls */}
      <Box mt={6}>
        <AdvancedPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </Box>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="#292a2d" borderColor="#3c4043">
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="#e8eaed">
              {t('deleteCardTitle')}
            </AlertDialogHeader>

            <AlertDialogBody color="#9aa0a6">
              {t('deleteCardConfirm')}
              {deleteCard && (
                <Box mt={3} p={3} bg="#35363a" borderRadius="md">
                  <Text fontSize="sm" color="#e8eaed" fontWeight="medium">
                    {truncateText(deleteCard.front, 80)}
                  </Text>
                </Box>
              )}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose} color="#9aa0a6" size="sm">
                  {t('cancel')}
                </Button>
              <Button
                bg="#F28B82"
                color="#202124"
                _hover={{ bg: "#F8A070" }}
                onClick={handleDeleteConfirm}
                ml={3}
                size="sm"
                >
                {t('delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default CardsList;