import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './routing';

export default getRequestConfig(async ({ locale }) => {
  // Use default locale if locale is not provided
  const currentLocale = locale || defaultLocale;
  console.log(`[request.ts] Processing request for locale: ${currentLocale}`);

  try {
    // Direct import with specified locale to ensure correct loading
    const messages = await import(`../locales/${currentLocale}/common.json`)
      .then(module => module.default)
      .catch(err => {
        console.error(`Failed to import ${currentLocale} locale, error:`, err);
        throw err;
      });
    
    console.log(`[request.ts] Successfully loaded ${currentLocale} messages`);
    
    // Log a few message keys to verify content
    const keys = Object.keys(messages).slice(0, 5);
    console.log(`[request.ts] ${currentLocale} sample keys: ${keys.join(', ')}`);

  return {
    messages: {
      common: messages,
    },
      locale: currentLocale,
      timeZone: 'UTC',
      formats: {
        dateTime: {
          short: {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          },
        },
      },
      defaultTranslationValues: {
        APP_NAME: 'TesTicTour'
      }
    };
  } catch (error) {
    console.error(`[request.ts] ERROR loading messages for locale: ${currentLocale}`, error);
    
    // Fall back to default locale if requested locale fails
    if (currentLocale !== defaultLocale) {
      console.log(`[request.ts] Falling back to default locale: ${defaultLocale}`);
      try {
        const defaultMessages = await import(`../locales/${defaultLocale}/common.json`)
          .then(module => module.default);
          
        return {
          locale: currentLocale, // Keep the requested locale for UI
          messages: {
            common: defaultMessages, // But use default locale messages
          },
        };
      } catch (fallbackError) {
        console.error(`[request.ts] Even fallback to ${defaultLocale} failed:`, fallbackError);
      }
    }
    
    // If even default locale fails, return empty messages
    return {
      locale: currentLocale,
      messages: {
        common: {},
      },
    };
  }
}); 