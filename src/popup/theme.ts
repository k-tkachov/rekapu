import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

/**
 * Rekapu Theme Configuration
 * 
 * This extension uses a single, consistent Material Design 3-inspired dark theme
 * throughout all interfaces (popup, dashboard, blocked page). The color palette
 * focuses on accessibility and readability with a modern, clean aesthetic.
 * 
 * Key Design Principles:
 * - Dark theme only (no light mode or theme switching)
 * - Material Design 3-inspired color palette
 * - Consistent color usage across all UI elements
 * - Optimal contrast ratios for text and interactive elements
 * 
 * Color Palette:
 * - Primary Blue (#8AB4F8): Used for brand colors, links, and primary actions
 * - Success Green (#34A853): Used for positive actions, success states, and streaks
 * - Warning Yellow (#FCC934): Used for warnings and in-progress states
 * - Error Red (#F28B82): Used for errors and destructive actions
 * - Background Dark (#202124): Main background
 * - Surface Dark (#292a2d): Cards and elevated surfaces
 * - Text Primary (#e8eaed): Main text color
 * - Text Secondary (#9aa0a6): Secondary text and labels
 */

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#8AB4F8',
      600: '#669DF6',
      700: '#4285F4',
      800: '#1A73E8',
      900: '#0D47A1',
    },
    gray: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b',
    },
    dark: {
      bg: '#202124',
      bgSecondary: '#292a2d',
      bgTertiary: '#35363a',
      border: '#3c4043',
      borderHover: '#5f6368',
      text: '#e8eaed',
      textSecondary: '#9aa0a6',
      textTertiary: '#5f6368',
    }
  },
  fonts: {
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
  },
  styles: {
    global: (props: any) => ({
      body: {
        fontSize: 'sm',
        lineHeight: 'base',
        bg: props.colorMode === 'dark' ? 'dark.bg' : 'white',
        color: props.colorMode === 'dark' ? 'dark.text' : 'gray.800',
      },
      '*::placeholder': {
        color: props.colorMode === 'dark' ? 'dark.textTertiary' : 'gray.400',
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'medium',
        borderRadius: '6px',
      },
      defaultProps: {
        size: 'sm',
        variant: 'solid',
      },
      variants: {
        solid: (props: any) => ({
          bg: props.colorMode === 'dark' ? 'brand.600' : 'brand.500',
          color: 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'brand.500' : 'brand.600',
            _disabled: {
              bg: props.colorMode === 'dark' ? 'brand.600' : 'brand.500',
            },
          },
        }),
        ghost: (props: any) => ({
          color: props.colorMode === 'dark' ? 'dark.text' : 'gray.600',
          _hover: {
            bg: props.colorMode === 'dark' ? 'dark.bgTertiary' : 'gray.100',
          },
          _active: {
            bg: props.colorMode === 'dark' ? 'dark.border' : 'gray.200',
          },
        }),
      },
    },
    Input: {
      defaultProps: {
        size: 'sm',
      },
      variants: {
        outline: (props: any) => ({
          field: {
            borderColor: props.colorMode === 'dark' ? 'dark.border' : 'gray.200',
            bg: props.colorMode === 'dark' ? 'dark.bgSecondary' : 'white',
            color: props.colorMode === 'dark' ? 'dark.text' : 'gray.800',
            _hover: {
              borderColor: props.colorMode === 'dark' ? 'dark.borderHover' : 'gray.300',
            },
            _focus: {
              borderColor: props.colorMode === 'dark' ? 'brand.500' : 'brand.500',
              boxShadow: props.colorMode === 'dark' 
                ? '0 0 0 1px #2196F3' 
                : '0 0 0 1px #2196F3',
            },
          },
        }),
      },
    },
    Box: {
      baseStyle: (props: any) => ({
        borderColor: props.colorMode === 'dark' ? 'dark.border' : 'gray.200',
      }),
    },
    Heading: {
      baseStyle: (props: any) => ({
        color: props.colorMode === 'dark' ? 'dark.text' : 'gray.800',
      }),
    },
    Text: {
      baseStyle: (props: any) => ({
        color: props.colorMode === 'dark' ? 'dark.text' : 'gray.800',
      }),
    },
    Badge: {
      variants: {
        solid: (props: any) => ({
          bg: props.colorMode === 'dark' ? 'brand.600' : 'brand.500',
          color: 'white',
        }),
        subtle: (props: any) => ({
          bg: props.colorMode === 'dark' ? 'dark.bgTertiary' : 'gray.100',
          color: props.colorMode === 'dark' ? 'dark.text' : 'gray.800',
        }),
      },
    },
    IconButton: {
      variants: {
        ghost: (props: any) => ({
          color: props.colorMode === 'dark' ? 'dark.textSecondary' : 'gray.500',
          _hover: {
            bg: props.colorMode === 'dark' ? 'dark.bgTertiary' : 'gray.100',
            color: props.colorMode === 'dark' ? 'dark.text' : 'gray.700',
          },
        }),
      },
    },
  },
  semanticTokens: {
    colors: {
      'chakra-body-bg': {
        _light: 'white',
        _dark: 'dark.bg',
      },
      'chakra-border-color': {
        _light: 'gray.200',
        _dark: 'dark.border',
      },
    },
  },
}); 