import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { CardManagerApp } from './CardManagerApp';
import { theme } from '../popup/theme';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <CardManagerApp />
    </ChakraProvider>
  </React.StrictMode>
); 