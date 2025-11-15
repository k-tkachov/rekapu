import React, { useState, useEffect, memo } from 'react';
import { Text } from '@chakra-ui/react';
import { t } from '../../utils/i18n';

interface DomainCountdownProps {
  lastUnblock: number;
  cooldownPeriod: number;
  textColor?: string;
  onExpire?: () => void;
}

const DomainCountdown: React.FC<DomainCountdownProps> = memo(({ 
  lastUnblock, 
  cooldownPeriod,
  textColor = '#fbbf24',
  onExpire
}) => {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Date.now();
      const unlockTime = lastUnblock + (cooldownPeriod * 60 * 1000);
      const remaining = unlockTime - now;

      if (remaining <= 0) {
        return t('expiring');
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${hours}${t('hourShort')} ${minutes}${t('minuteShort')} ${seconds}${t('secondShort')}`;
      } else if (minutes > 0) {
        return `${minutes}${t('minuteShort')} ${seconds}${t('secondShort')}`;
      } else {
        return `${seconds}${t('secondShort')}`;
      }
    };

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      const newTime = calculateTimeRemaining();
      setTimeRemaining(newTime);

      // If expired, notify parent to refresh domains data
      if (newTime === t('expiring')) {
        clearInterval(interval);
        // Small delay to ensure the time has actually passed
        setTimeout(() => {
          if (onExpire) {
            onExpire();
          }
        }, 1000);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUnblock, cooldownPeriod]);

  return (
    <Text fontSize="xs" color={textColor} fontWeight="normal" opacity={0.85}>
      {timeRemaining}
    </Text>
  );
}, (prevProps, nextProps) => {
  // Only re-render if lastUnblock or cooldownPeriod changes
  // Don't re-render for parent updates
  return prevProps.lastUnblock === nextProps.lastUnblock && 
         prevProps.cooldownPeriod === nextProps.cooldownPeriod;
});

DomainCountdown.displayName = 'DomainCountdown';

export default DomainCountdown;

