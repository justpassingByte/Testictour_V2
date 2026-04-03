import { getTranslations as getNextIntlTranslations } from 'next-intl/server';

/**
 * Get translations for server components
 * 
 * @param namespace The namespace to get translations from (default: 'common')
 * @returns A function to get translations
 * 
 * @example
 * const t = await getTranslations();
 * return <h1>{t('hello')}</h1>;
 */
export async function getTranslations(namespace = 'common') {
  return await getNextIntlTranslations(namespace);
} 