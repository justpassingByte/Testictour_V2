'use client';

import { useLocale, useTranslations } from 'next-intl';
import { routing } from '../../../i18n/routing';

export default function LocaleDebug() {
  const locale = useLocale();
  let translations = {};
  let translationSamples = {};
  
  try {
    const t = useTranslations('common');
    
    // Test some basic translations
    translationSamples = {
      home: t('home'),
      tournaments: t('tournaments'),
      players: t('players'),
      login: t('login'),
      register: t('register')
    };
  } catch (e) {
    console.error('[LocaleDebug] Translation error:', e);
  }
  
  const allLocales = routing.locales;

  return (
    <div className="fixed bottom-0 left-0 z-50 p-3 bg-gray-800 text-white text-xs max-w-md overflow-auto max-h-48">
      <h2 className="font-bold mb-2">Locale Debug</h2>
      <div className="mb-2">
        <strong>Current locale:</strong> {locale}
      </div>
      <div className="mb-2">
        <strong>Available locales:</strong> {allLocales.join(', ')}
      </div>
      <div className="mb-2">
        <strong>Sample translations:</strong>
        <ul className="pl-4 mt-1">
          {Object.entries(translationSamples).map(([key, value]) => (
            <li key={key}>
              {key}: {String(value)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 