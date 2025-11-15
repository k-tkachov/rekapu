import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  // Astro automatically sets currentLocale based on URL
  // We just need to make it available to components
  const locale = context.currentLocale || 'en';
  context.locals.locale = locale;
  
  return next();
});

