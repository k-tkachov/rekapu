import React from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  HStack,
  Text,
  useRadioGroup,
  useRadio,
  UseRadioProps,
} from '@chakra-ui/react';
import { CardType } from '../../types';
import { t } from '../../utils/i18n';

interface CardTypeSelectorProps {
  value: CardType;
  onChange: (type: CardType) => void;
  isDisabled?: boolean;
}

interface CardTypeOption {
  value: CardType;
  label: string;
  shortDesc: string;
}

const getCardTypes = (): CardTypeOption[] => [
  {
    value: 'basic',
    label: t('basic'),
    shortDesc: t('showAnswerCard'),
  },
  {
    value: 'cloze',
    label: t('clozeDeletion'),
    shortDesc: t('fillInTheBlanks'),
  },
];

function CompactRadioCard(props: UseRadioProps & { children: React.ReactNode }) {
  const { getInputProps, getRadioProps } = useRadio(props);

  const input = getInputProps();
  const checkbox = getRadioProps();

  return (
    <Box as="label" flex={1}>
      <input {...input} />
      <Box
        {...checkbox}
        cursor="pointer"
        borderWidth="1px"
        borderRadius="md"
        borderColor="#3c4043"
        bg="#292a2d"
        color="#e8eaed"
        _checked={{
          bg: '#8AB4F8',
          borderColor: '#8AB4F8',
          color: '#202124',
        }}
        _hover={{
          borderColor: _checked => _checked ? '#8AB4F8' : '#5f6368',
          bg: _checked => _checked ? '#8AB4F8' : '#35363a',
        }}
        _focus={{
          boxShadow: '0 0 0 2px rgba(138, 180, 248, 0.3)',
        }}
        px={3}
        py={2}
        transition="all 0.15s"
        textAlign="center"
      >
        {props.children}
      </Box>
    </Box>
  );
}

export const CardTypeSelector: React.FC<CardTypeSelectorProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'card-type',
    value,
    onChange: (nextValue) => onChange(nextValue as CardType),
  });

  const group = getRootProps();
  const cardTypes = getCardTypes();

  return (
    <FormControl isDisabled={isDisabled}>
      <FormLabel color="#e8eaed" fontSize="sm" fontWeight="medium" mb={2}>
        {t('cardType')}
      </FormLabel>
      
      <HStack spacing={2} {...group}>
        {cardTypes.map((type) => {
          const radio = getRadioProps({ value: type.value });
          return (
            <CompactRadioCard key={type.value} {...radio}>
              <Box>
                <Text fontWeight="medium" fontSize="sm" lineHeight="short">
                  {type.label}
                </Text>
                <Text fontSize="xs" opacity={0.7} lineHeight="short">
                  {type.shortDesc}
                </Text>
              </Box>
            </CompactRadioCard>
          );
        })}
      </HStack>
    </FormControl>
  );
}; 