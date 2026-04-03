export const locales = ['en', 'vi', 'ko', 'zh'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

// Define language labels for the language switcher
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
  ko: '한국어',
  zh: '中文',
}; 