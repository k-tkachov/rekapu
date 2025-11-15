/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
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
        success: '#34A853',
        warning: '#FCC934',
        error: '#F28B82',
        dark: {
          bg: '#202124',
          'bg-secondary': '#292a2d',
          'bg-tertiary': '#35363a',
          border: '#3c4043',
          'border-hover': '#5f6368',
          text: '#e8eaed',
          'text-secondary': '#9aa0a6',
          'text-tertiary': '#5f6368',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', 'Monaco', '"Cascadia Code"', '"Roboto Mono"', 'Consolas', '"Courier New"', 'monospace'],
      },
      borderRadius: {
        'rekapu-sm': '6px',
        'rekapu-md': '8px',
        'rekapu-lg': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.dark.text'),
            '--tw-prose-headings': theme('colors.dark.text'),
            '--tw-prose-links': theme('colors.brand.500'),
            '--tw-prose-bold': theme('colors.dark.text'),
            '--tw-prose-counters': theme('colors.dark.text-secondary'),
            '--tw-prose-bullets': theme('colors.dark.text-secondary'),
            '--tw-prose-hr': theme('colors.dark.border'),
            '--tw-prose-quotes': theme('colors.dark.text'),
            '--tw-prose-quote-borders': theme('colors.dark.border'),
            '--tw-prose-captions': theme('colors.dark.text-secondary'),
            '--tw-prose-code': theme('colors.brand.400'),
            '--tw-prose-pre-code': theme('colors.dark.text'),
            '--tw-prose-pre-bg': theme('colors.dark.bg-tertiary'),
            '--tw-prose-th-borders': theme('colors.dark.border'),
            '--tw-prose-td-borders': theme('colors.dark.border'),
            fontSize: '1rem',
            lineHeight: '1.75',
            maxWidth: 'none',
            h1: {
              fontSize: '2.5rem',
              fontWeight: '500',
              marginTop: '0',
              marginBottom: '1.5rem',
            },
            h2: {
              fontSize: '2rem',
              fontWeight: '500',
              marginTop: '3rem',
              marginBottom: '1.25rem',
            },
            h3: {
              fontSize: '1.5rem',
              fontWeight: '500',
              marginTop: '2.5rem',
              marginBottom: '1rem',
            },
            h4: {
              fontSize: '1.25rem',
              fontWeight: '500',
              marginTop: '2rem',
              marginBottom: '0.75rem',
            },
            p: {
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
            },
            'ol > li': {
              paddingLeft: '0.5rem',
            },
            'ul > li': {
              paddingLeft: '0.5rem',
            },
            'ul, ol': {
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
            },
            code: {
              backgroundColor: theme('colors.dark.bg-tertiary'),
              padding: '0.125rem 0.375rem',
              borderRadius: '4px',
              fontSize: '0.875em',
              fontWeight: '400',
              border: `1px solid ${theme('colors.dark.border')}`,
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: theme('colors.dark.bg-tertiary'),
              padding: '1.5rem',
              borderRadius: theme('borderRadius.rekapu-md'),
              border: `1px solid ${theme('colors.dark.border')}`,
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              border: 'none',
              fontSize: 'inherit',
            },
            a: {
              color: theme('colors.brand.500'),
              textDecoration: 'none',
              fontWeight: '400',
              '&:hover': {
                color: theme('colors.brand.400'),
              },
            },
            strong: {
              fontWeight: '500',
            },
            blockquote: {
              borderLeftColor: theme('colors.dark.border'),
              color: theme('colors.dark.text-secondary'),
              fontStyle: 'normal',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

