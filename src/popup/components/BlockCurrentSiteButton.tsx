import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  useDisclosure,
  useToast,
  Badge,
  Icon,
  Spinner,
} from '@chakra-ui/react';
import { LockIcon, AddIcon } from '@chakra-ui/icons';
import { StorageAPI } from '../../storage/StorageAPI';
import { DomainSettings } from '../../types/storage';
import { t } from '../../utils/i18n';

interface BlockCurrentSiteButtonProps {
  onDomainBlocked?: () => void;
  style?: 'primary' | 'secondary';
}

const BlockCurrentSiteButton: React.FC<BlockCurrentSiteButtonProps> = ({ 
  onDomainBlocked,
  style = 'primary'
}) => {
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isAlreadyBlocked, setIsAlreadyBlocked] = useState(false);
  const [cooldownPeriod, setCooldownPeriod] = useState(2);
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [domainToBlock, setDomainToBlock] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Material dark theme colors
  const bgColor = '#202124';
  const bgSecondary = '#292a2d';
  const bgTertiary = '#35363a';
  const borderColor = '#3c4043';
  const textPrimary = '#e8eaed';
  const textSecondary = '#9aa0a6';
  const textTertiary = '#5f6368';
  const primaryGreen = '#34A853';
  const primaryGreenHover = '#46B968';
  const secondaryBlue = '#8AB4F8';
  const secondaryBlueHover = '#A8C7FA';

  useEffect(() => {
    getCurrentTabDomain();
  }, []);

  const extractRootDomain = (hostname: string): string => {
    const domain = hostname.replace(/^www\./, '');
    const parts = domain.split('.');
    
    // Handle common multi-part TLDs
    const multiPartTlds = [
      'com.ua', 'co.uk', 'com.au', 'co.za', 'com.br', 'co.jp', 
      'com.cn', 'co.in', 'co.kr', 'com.mx', 'co.nz', 'com.sg',
      'co.il', 'com.ar', 'com.co', 'com.pe', 'com.ph', 'com.pk',
      'com.tr', 'co.th', 'com.vn', 'co.id', 'com.my', 'co.za'
    ];
    
    if (parts.length > 2) {
      // Check if domain uses a multi-part TLD
      const lastTwoParts = parts.slice(-2).join('.');
      if (multiPartTlds.includes(lastTwoParts)) {
        // Take last 3 parts for multi-part TLDs
        return parts.slice(-3).join('.');
      } else {
        // Take last 2 parts for regular TLDs  
        return parts.slice(-2).join('.');
      }
    }
    return domain;
  };

  const getCurrentTabDomain = async () => {
    try {
      setIsLoading(true);
      
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url) {
        const url = new URL(tabs[0].url);
        const fullDomain = url.hostname.replace(/^www\./, '');
        const rootDomain = extractRootDomain(url.hostname);
        
        setCurrentDomain(fullDomain);
        // Default to root domain for blocking, but allow user to choose
        if (fullDomain === rootDomain) {
          // Already on root domain, so set it as the domain to block with subdomains included
          setDomainToBlock(fullDomain);
          setIncludeSubdomains(true);
        } else {
          // On subdomain, default to root domain with subdomains included
          setDomainToBlock(rootDomain);
          setIncludeSubdomains(true);
        }
        
        // Check if domain is already blocked
        const result = await StorageAPI.getDomain(fullDomain);
        setIsAlreadyBlocked(Boolean(result.success && result.data && typeof result.data === 'object' && result.data.domain === fullDomain));
        
        // Load default cooldown from settings
        const settingsResult = await StorageAPI.getGlobalSettings();
        if (settingsResult.success && settingsResult.data) {
          setCooldownPeriod(settingsResult.data.defaultCooldownPeriod);
        }
      }
    } catch (error) {
      console.error('Error getting current tab domain:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockSite = async () => {
    if (!domainToBlock) return;
    
    try {
      setIsBlocking(true);
      
      const now = Date.now();
      const domainSettings: DomainSettings = {
        domain: domainToBlock,
        cooldownPeriod,
        isActive: true,
        lastUnblock: 0,
        subdomainsIncluded: includeSubdomains,
        created: now,
        modified: now,
      };
      
      const result = await StorageAPI.setDomain(domainToBlock, domainSettings);
      
      if (result.success) {
        // Immediately trigger blocking on the current tab for better UX
        // Small delay to ensure background script has processed the domain addition
        setTimeout(async () => {
          try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'RECHECK_DOMAIN_BLOCKING'
              }, (response) => {
                // Ignore response - just trigger the recheck
                if (chrome.runtime.lastError) {
                  console.log('Content script not available, blocking will work on next navigation');
                }
              });
            }
          } catch (error) {
            console.log('Failed to trigger immediate blocking, will work on next navigation');
          }
        }, 100);
        
        toast({
          title: t('siteBlockedSuccessfully'),
          description: t('addedToBlockList', domainToBlock),
          status: 'success',
          duration: 3000,
        });
        
        setIsAlreadyBlocked(true);
        onClose();
        onDomainBlocked?.();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: t('errorBlockingSite'),
        description: t('failedToAddToBlockList'),
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsBlocking(false);
    }
  };

  const isExtensionPage = currentDomain.includes('chrome-extension://');
  const isLocalPage = currentDomain === 'localhost' || currentDomain.startsWith('127.0.0.1') || currentDomain.startsWith('192.168.');
  const isInvalidPage = isExtensionPage || isLocalPage || !currentDomain;

  const buttonProps = {
    display: 'block',
    size: 'md',
    w: 'full',
    ...(isLoading && { leftIcon: <Spinner size="sm" /> }),
    borderRadius: '6px',
    fontWeight: 'medium',
    isDisabled: isInvalidPage || isLoading,
    onClick: isAlreadyBlocked ? undefined : onOpen,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  if (style === 'primary') {
    Object.assign(buttonProps, {
      bg: isAlreadyBlocked ? bgTertiary : primaryGreen,
      color: isAlreadyBlocked ? textSecondary : 'white',
      _hover: isAlreadyBlocked ? {} : { bg: primaryGreenHover },
      borderWidth: isAlreadyBlocked ? 1 : 0,
      borderColor: isAlreadyBlocked ? borderColor : 'transparent',
    });
  } else {
    Object.assign(buttonProps, {
      bg: bgTertiary,
      color: textPrimary,
      borderWidth: 1,
      borderColor: borderColor,
      _hover: { bg: '#3c4043', borderColor: '#5f6368' },
    });
  }

  return (
    <>
      <Button {...buttonProps}>
        {isLoading ? t('detectingSite') : 
         isAlreadyBlocked ? t('siteBlocked', currentDomain) :
         isInvalidPage ? t('cannotBlockPage') :
         t('blockSite', domainToBlock || currentDomain)}
      </Button>

      {/* Quick Block Configuration Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg={bgSecondary} borderColor={borderColor} borderWidth={1}>
          <ModalHeader color={textPrimary} borderBottomWidth={1} borderColor={borderColor}>
            <HStack spacing={3}>
              <Icon as={LockIcon} color={secondaryBlue} />
              <VStack align="start" spacing={0}>
                <Text fontSize="lg" fontWeight="semibold">
                  {t('blockWebsite')}
                </Text>
                <Text fontSize="sm" fontWeight="normal" color={textSecondary}>
                  {currentDomain}
                </Text>
              </VStack>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color={textSecondary} />
          
          <ModalBody py={6}>
            <VStack spacing={4} align="stretch">
              <Text color={textSecondary} fontSize="sm">
                {t('willAddToDomains')}
              </Text>
              
              {/* Domain Selection */}
              {currentDomain !== extractRootDomain(currentDomain) && (
                <FormControl>
                  <FormLabel color={textPrimary} fontSize="sm" fontWeight="medium">
                    {t('whichDomainToBlock')}
                  </FormLabel>
                  <VStack spacing={2} align="stretch">
                    <HStack
                      p={3}
                      bg={domainToBlock === currentDomain ? secondaryBlue : bgTertiary}
                      borderWidth={1}
                      borderColor={domainToBlock === currentDomain ? secondaryBlue : borderColor}
                      borderRadius="6px"
                      cursor="pointer"
                      onClick={() => {
                        setDomainToBlock(currentDomain);
                        setIncludeSubdomains(false); // When blocking specific subdomain, don't include subdomains
                      }}
                      _hover={{ borderColor: secondaryBlue }}
                    >
                      <Text color={textPrimary} fontSize="sm" fontWeight="medium" flex={1}>
                        {currentDomain}
                      </Text>
                      <Text color={textTertiary} fontSize="xs">
                        {t('thisSubdomainOnly')}
                      </Text>
                    </HStack>
                    <HStack
                      p={3}
                      bg={domainToBlock === extractRootDomain(currentDomain) ? secondaryBlue : bgTertiary}
                      borderWidth={1}
                      borderColor={domainToBlock === extractRootDomain(currentDomain) ? secondaryBlue : borderColor}
                      borderRadius="6px"
                      cursor="pointer"
                      onClick={() => {
                        setDomainToBlock(extractRootDomain(currentDomain));
                        setIncludeSubdomains(true); // When blocking root domain, default to including subdomains
                      }}
                      _hover={{ borderColor: secondaryBlue }}
                    >
                      <Text color={textPrimary} fontSize="sm" fontWeight="medium" flex={1}>
                        {extractRootDomain(currentDomain)}
                      </Text>
                      <Text color={textTertiary} fontSize="xs">
                        {t('entireWebsite')}
                      </Text>
                    </HStack>
                  </VStack>
                  <FormHelperText color={textTertiary} fontSize="xs">
                    {t('chooseSubdomainOrEntire')}
                  </FormHelperText>
                </FormControl>
              )}
              
              {currentDomain === extractRootDomain(currentDomain) && (
                <Text color={textSecondary} fontSize="sm">
                  {t('willBlockEntireWebsite', domainToBlock)}
                </Text>
              )}
              
              <FormControl>
                <FormLabel color={textPrimary} fontSize="sm" fontWeight="medium">
                  {t('cooldownPeriod')}
                </FormLabel>
                <HStack spacing={3}>
                  <NumberInput
                    value={cooldownPeriod}
                    onChange={(_, value) => setCooldownPeriod(value || 1)}
                    min={1}
                    max={1440}
                    size="sm"
                    flex={1}
                  >
                    <NumberInputField
                      bg={bgTertiary}
                      borderColor={borderColor}
                      color={textPrimary}
                      _hover={{ borderColor: '#5f6368' }}
                      _focus={{ borderColor: secondaryBlue, boxShadow: `0 0 0 1px ${secondaryBlue}` }}
                    />
                    <NumberInputStepper>
                      <NumberIncrementStepper borderColor={borderColor} />
                      <NumberDecrementStepper borderColor={borderColor} />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text color={textSecondary} fontSize="sm" minW="fit-content">
                    {t('minutes')}
                  </Text>
                </HStack>
                <FormHelperText color={textTertiary} fontSize="xs">
                  {t('timeBeforeAccess')}
                </FormHelperText>
              </FormControl>
              
                              {/* Only show subdomain toggle when blocking root domain */}
              {domainToBlock === extractRootDomain(currentDomain) && (
                <FormControl display="flex" alignItems="center" justifyContent="space-between">
                  <VStack align="start" spacing={1} flex={1}>
                    <FormLabel color={textPrimary} fontSize="sm" fontWeight="medium" mb={0}>
                      {t('includeSubdomains')}
                    </FormLabel>
                    <FormHelperText color={textTertiary} fontSize="xs" mt={0}>
                      {t('alsoBlockSubdomains', domainToBlock)}
                    </FormHelperText>
                  </VStack>
                  <Switch
                    colorScheme="blue"
                    isChecked={includeSubdomains}
                    onChange={(e) => setIncludeSubdomains(e.target.checked)}
                  />
                </FormControl>
              )}
            </VStack>
          </ModalBody>
          
          <ModalFooter borderTopWidth={1} borderColor={borderColor}>
            <HStack spacing={3}>
              <Button
                variant="ghost"
                color={textSecondary}
                onClick={onClose}
                borderRadius="6px"
              >
                {t('cancel')}
              </Button>
              <Button
                bg={primaryGreen}
                color="white"
                _hover={{ bg: primaryGreenHover }}
                onClick={handleBlockSite}
                isLoading={isBlocking}
                loadingText={t('blocking')}
                borderRadius="6px"
                fontWeight="medium"
                leftIcon={<AddIcon />}
              >
                {t('blockSite', '')}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default BlockCurrentSiteButton;
