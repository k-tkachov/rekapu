import React from 'react';
import {
  VStack,
  HStack,
  Input,
  IconButton,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Box,
  Text,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';

interface OptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
  label?: string;
  helperText?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  minOptions?: number;
  maxOptions?: number;
}

export const OptionsEditor: React.FC<OptionsEditorProps> = ({
  options,
  onChange,
  label = "Answer Options",
  helperText,
  isRequired = false,
  isDisabled = false,
  minOptions = 2,
  maxOptions = 6,
}) => {
  const addOption = () => {
    if (options.length < maxOptions) {
      onChange([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > minOptions) {
      const newOptions = options.filter((_, i) => i !== index);
      onChange(newOptions);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange(newOptions);
  };

  return (
    <FormControl isRequired={isRequired} isDisabled={isDisabled}>
      <FormLabel color="#e8eaed" fontSize="sm" fontWeight="medium">
        {label}
      </FormLabel>
      
      <VStack spacing={3} align="stretch">
        {options.map((option, index) => (
          <HStack key={index} spacing={3}>
            <Box flex={1}>
              <Input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                bg="#292a2d"
                borderColor="#3c4043"
                color="#e8eaed"
                fontSize="sm"
                _hover={{ borderColor: '#5f6368' }}
                _focus={{
                  borderColor: '#8AB4F8',
                  boxShadow: '0 0 0 3px rgba(138, 180, 248, 0.3)',
                }}
                _placeholder={{ color: '#5f6368' }}
              />
            </Box>
            
            <IconButton
              aria-label={`Remove option ${index + 1}`}
              icon={<DeleteIcon />}
              size="sm"
              variant="ghost"
              colorScheme="red"
              onClick={() => removeOption(index)}
              isDisabled={options.length <= minOptions || isDisabled}
              _hover={{ bg: 'rgba(242, 139, 130, 0.1)' }}
            />
          </HStack>
        ))}
        
        {options.length < maxOptions && (
          <Button
            leftIcon={<AddIcon />}
            onClick={addOption}
            variant="ghost"
            size="sm"
            color="#9aa0a6"
            _hover={{ color: "#e8eaed", bg: "#292a2d" }}
            isDisabled={isDisabled}
            justifyContent="flex-start"
          >
            Add Option
          </Button>
        )}
      </VStack>

      <HStack justify="space-between" mt={2}>
        {helperText && (
          <FormHelperText color="#9aa0a6" fontSize="xs" flex={1}>
            {helperText}
          </FormHelperText>
        )}
        
        <Text color="#5f6368" fontSize="xs">
          {options.length}/{maxOptions} options
        </Text>
      </HStack>
    </FormControl>
  );
}; 