import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Button,
  Box,
  useToast,
  Divider,
  Card,
  CardBody,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
} from '@chakra-ui/react';
import { CardTypeSelector } from './CardTypeSelector';
import { LiveMarkdownEditor } from '../../popup/components/LiveMarkdownEditor';
import { TagSelector } from './TagSelector';
import { Card as CardData, CardType } from '../../types';
import { StorageAPI } from '../../storage/StorageAPI';
import { parseClozeText } from '../../utils/clozeParser';
import { DEFAULT_SPACED_REPETITION } from '../../types/storage';
import { t } from '../../utils/i18n';

interface CardFormProps {
  card?: CardData;
  prefilledText?: string;
  onSave: (card: CardData) => void;
  onSaveAndAddAnother?: (card: CardData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface CardFormData {
  type: CardType;
  front: string;
  back: string;
  tags: string[];
  isDraft: boolean;
}

const DEFAULT_FORM_DATA: CardFormData = {
  type: 'basic',
  front: '',
  back: '',
  tags: [],
  isDraft: false,
};

const CardForm: React.FC<CardFormProps> = ({
  card,
  prefilledText,
  onSave,
  onSaveAndAddAnother,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CardFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [tagRefreshTrigger, setTagRefreshTrigger] = useState(0);
  const toast = useToast();

  // Material dark theme colors
  const bgSecondary = '#292a2d';
  const bgTertiary = '#35363a';
  const borderColor = '#3c4043';
  const textPrimary = '#e8eaed';
  const textSecondary = '#9aa0a6';
  const primaryGreen = '#34A853';
  const primaryGreenHover = '#46B968';

  useEffect(() => {
    if (card) {
      setFormData({
        type: card.type,
        front: card.front,
        back: card.back,
        tags: card.tags || [],
        isDraft: card.isDraft || false,
      });
    } else if (prefilledText) {
      // Pre-fill form with selected text from context menu
      setFormData({
        ...DEFAULT_FORM_DATA,
        front: prefilledText,
      });
    } else {
      setFormData(DEFAULT_FORM_DATA);
    }
  }, [card, prefilledText]);

  const validateForm = (): string | null => {
    if (!formData.front.trim()) {
      return t('cardFrontRequired');
    }
    
    // For cloze cards, the back field is not needed since answers are in the front text
    if (formData.type !== 'cloze' && !formData.back.trim()) {
      return t('cardBackRequired');
    }

    return null;
  };

  const handleSubmit = async (addAnother: boolean = false) => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: t('validationError'),
        description: validationError,
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setSaving(true);
    try {
      // Auto-create tags BEFORE saving card (only for manual card creation)
      if (formData.tags && formData.tags.length > 0) {
        const ensureResult = await StorageAPI.ensureTagsExist(formData.tags);
        if (!ensureResult.success) {
          throw new Error(ensureResult.error || 'Failed to create tags');
        }
      }

      let cardData: any = {
        type: formData.type,
        front: formData.front.trim(),
        back: formData.type === 'cloze' ? t('clozeCardAnswersInDeletions') : formData.back.trim(),
        tags: formData.tags,
        isDraft: formData.isDraft,
      };

      // Handle cloze cards - parse and generate deletions
      if (formData.type === 'cloze') {
        const parseResult = parseClozeText(formData.front);
        if (parseResult.hasClozeDeletions && parseResult.errors.length === 0) {
          cardData.clozeSource = formData.front.trim();
          cardData.clozeDeletions = parseResult.deletions.map(deletion => ({
            id: deletion.id,
            text: deletion.text,
            hint: deletion.hint,
            algorithm: { ...DEFAULT_SPACED_REPETITION }
          }));
        } else if (parseResult.errors.length > 0) {
          throw new Error(t('clozeParsingErrors', parseResult.errors.join(', ')));
        }
      }

      let result;
      if (card) {
        // Update existing card
        result = await StorageAPI.updateCard(card.id, cardData);
      } else {
        // Create new card
        result = await StorageAPI.createCard(cardData);
      }

      if (result.success && result.data) {
        if (addAnother && onSaveAndAddAnother) {
          // Reset form for next card, but keep type
          const currentType = formData.type;
          setFormData({
            ...DEFAULT_FORM_DATA,
            type: currentType,
          });
          // Refresh tag autocomplete to include any new tags that were just created
          setTagRefreshTrigger(prev => prev + 1);
          onSaveAndAddAnother(result.data);
        } else {
          onSave(result.data);
        }
      } else {
        throw new Error(result.error || 'Failed to save card');
      }
    } catch (error) {
      console.error('Failed to save card:', error);
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('failedToSaveCard'),
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box maxW="4xl" w="full" mx="auto">
      <Card bg={bgSecondary} borderColor={borderColor}>
        <CardBody>
          <VStack spacing={6} align="stretch">
            <CardTypeSelector
              value={formData.type}
              onChange={(type: CardType) => setFormData(prev => ({ ...prev, type }))}
            />

            <LiveMarkdownEditor
              value={formData.front}
              onChange={(front: string) => setFormData(prev => ({ ...prev, front }))}
              label={formData.type === 'cloze' ? t('clozeContentLabel') : t('cardFrontLabel')}
              placeholder={formData.type === 'cloze' ? t('clozeContentPlaceholder') : t('cardFrontPlaceholder')}
              helperText={formData.type === 'cloze' ? t('clozeContentHelper') : t('cardFrontHelper')}
              isRequired
              minHeight="100%"
              cardType={formData.type}
            />

            {formData.type !== 'cloze' && (
              <LiveMarkdownEditor
                value={formData.back}
                onChange={(back: string) => setFormData(prev => ({ ...prev, back }))}
                label={t('answerBackLabel')}
                placeholder={t('answerBackPlaceholder')}
                helperText={t('answerBackHelper')}
                isRequired
                minHeight="100%"
              />
            )}

            <Divider borderColor={borderColor} />

            <TagSelector
              selectedTags={formData.tags}
              onChange={(tags: string[]) => setFormData(prev => ({ ...prev, tags }))}
              refreshTrigger={tagRefreshTrigger}
            />

            <Divider borderColor={borderColor} />

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <FormLabel htmlFor="draft-toggle" mb="0" color={textPrimary} fontSize="sm" fontWeight="500">
                  {t('markAsDraft')}
                </FormLabel>
                <FormHelperText color={textSecondary} fontSize="xs" mt="1">
                  {t('draftCardsWontAppear')}
                </FormHelperText>
              </Box>
              <Switch
                id="draft-toggle"
                isChecked={formData.isDraft}
                onChange={(e) => setFormData(prev => ({ ...prev, isDraft: e.target.checked }))}
                colorScheme="orange"
                size="md"
              />
            </FormControl>

            <Divider borderColor={borderColor} />

            <HStack justify="flex-end" spacing={4}>
              <Button
                variant="ghost"
                onClick={onCancel}
                isDisabled={saving || isLoading}
                color={textSecondary}
                _hover={{ color: textPrimary, bg: bgTertiary }}
              >
                {t('cancel')}
              </Button>
              
              {!card && onSaveAndAddAnother && (
                <Button
                  variant="outline"
                  borderColor={primaryGreen}
                  color={primaryGreen}
                  _hover={{ bg: primaryGreen, color: 'white' }}
                  _active={{ bg: primaryGreenHover, color: 'white' }}
                  onClick={() => handleSubmit(true)}
                  isLoading={saving}
                  loadingText={t('creating')}
                  isDisabled={isLoading}
                  size="md"
                >
                  {t('saveAndAddAnother')}
                </Button>
              )}
              
              <Button
                bg={primaryGreen}
                color="white"
                _hover={{ bg: primaryGreenHover }}
                _active={{ bg: primaryGreenHover }}
                onClick={() => handleSubmit(false)}
                isLoading={saving}
                loadingText={card ? 'Updating...' : 'Creating...'}
                isDisabled={isLoading}
                size="md"
              >
                {card ? t('updateCard') : t('createCard')}
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default CardForm; 