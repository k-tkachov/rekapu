import React from 'react';
import {
  HStack,
  IconButton,
  Button,
  Text,
  ButtonGroup,
} from '@chakra-ui/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@chakra-ui/icons';
import { t } from '../../utils/i18n';

interface AdvancedPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
}

export const AdvancedPagination: React.FC<AdvancedPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 7,
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    // If total pages is small, show all
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const sidePages = Math.floor((maxVisiblePages - 3) / 2); // -3 for first, last, and current
    let startPage = Math.max(2, currentPage - sidePages);
    let endPage = Math.min(totalPages - 1, currentPage + sidePages);

    // Adjust range if we're near the beginning or end
    if (currentPage <= sidePages + 2) {
      endPage = Math.min(totalPages - 1, maxVisiblePages - 2);
    }
    if (currentPage >= totalPages - sidePages - 1) {
      startPage = Math.max(2, totalPages - maxVisiblePages + 2);
    }

    // Add ellipsis if gap between first and start
    if (startPage > 2) {
      pages.push('...');
    }

    // Add pages around current
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis if gap between end and last
    if (endPage < totalPages - 1) {
      pages.push('...');
    }

    // Always show last page (if not already included)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const buttonStyles = {
    size: "sm" as const,
    bg: "#292a2d",
    borderColor: "#3c4043",
    color: "#9aa0a6",
    _hover: { 
      bg: "#3c4043", 
      borderColor: "#5f6368",
      color: "#e8eaed"
    },
    _active: { 
      bg: "#3c4043", 
      borderColor: "#5f6368" 
    },
  };

  const activeButtonStyles = {
    ...buttonStyles,
    bg: "#8AB4F8",
    borderColor: "#8AB4F8",
    color: "#202124",
    _hover: { 
      bg: "#669DF6", 
      borderColor: "#669DF6",
      color: "#202124"
    },
  };

  return (
    <HStack justify="center" spacing={2}>
      <ButtonGroup size="sm" isAttached variant="outline">
        {/* Previous button */}
        <IconButton
          aria-label={t('previousPage')}
          icon={<ChevronLeftIcon />}
          onClick={() => onPageChange(currentPage - 1)}
          isDisabled={currentPage === 1}
          {...buttonStyles}
        />

        {/* Page number buttons */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <Button
                key={`ellipsis-${index}`}
                isDisabled
                {...buttonStyles}
                _hover={{}}
                cursor="default"
              >
                ...
              </Button>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <Button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              {...(isActive ? activeButtonStyles : buttonStyles)}
            >
              {pageNum}
            </Button>
          );
        })}

        {/* Next button */}
        <IconButton
          aria-label={t('nextPage')}
          icon={<ChevronRightIcon />}
          onClick={() => onPageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages}
          {...buttonStyles}
        />
      </ButtonGroup>

      {/* Page info */}
      <Text color="#9aa0a6" fontSize="sm" ml={4}>
        {t('pageXOfY', [String(currentPage), String(totalPages)])}
      </Text>
    </HStack>
  );
};
