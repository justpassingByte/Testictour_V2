# TesTicTour Internationalization (i18n) Guide

This guide explains how internationalization is implemented in the TesTicTour application.

## Overview

TesTicTour uses [next-intl](https://next-intl-docs.vercel.app/) for internationalization. The application supports the following languages:

- English (en) - Default
- Vietnamese (vi)
- Korean (ko)
- Chinese (zh)

## Directory Structure

```
app/
├── [locale]/
│   ├── layout.tsx       # Layout with locale provider
│   ├── page.tsx         # Home page with client-side translations
│   └── tournaments/     # Example of a nested localized route
│       └── page.tsx     # Server component with translations
├── components/
│   └── LanguageSwitcher.tsx  # Component to switch languages
├── lib/
│   └── getTranslations.ts    # Utility for server components
├── locales/
│   ├── en/              # English translations
│   │   └── common.json
│   ├── vi/              # Vietnamese translations
│   │   └── common.json
│   ├── ko/              # Korean translations
│   │   └── common.json
│   └── zh/              # Chinese translations
│       └── common.json
├── config.ts            # i18n configuration
└── middleware.ts        # Middleware for locale detection
```

## How to Use Translations

### In Client Components

Use the `useTranslations` hook:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('common');
  
  return <h1>{t('hello')}</h1>;
}
```

### In Server Components

Use the `getTranslations` utility:

```tsx
import { getTranslations } from '../../lib/getTranslations';

export default async function MyServerComponent({
  params: { locale }
}: {
  params: { locale: string }
}) {
  const t = await getTranslations(locale);
  
  return <h1>{t('hello')}</h1>;
}
```

## Adding New Translations

1. Add a new key-value pair to each locale file in `app/locales/[language]/common.json`
2. Use the key in your components with `t('your_key')`

## Language Switcher

The language switcher component allows users to change the current language. It's implemented in `app/components/LanguageSwitcher.tsx` and used in the main layout.

## Adding a New Language

To add a new language:

1. Add the language code to the `locales` array in `app/config.ts`
2. Create a new directory in `app/locales/` with the language code
3. Copy an existing locale file (e.g., `common.json`) to the new directory and translate the values

## URL Structure

The application uses URL-based locale detection. URLs are structured as follows:

- `/en/page` - English version
- `/vi/page` - Vietnamese version
- `/ko/page` - Korean version
- `/zh/page` - Chinese version

The default locale (English) can be accessed without the prefix: `/page`

## Middleware

The middleware in `middleware.ts` handles:
- Locale detection from URL
- Redirects to the default locale if no locale is specified
- Browser preference detection for first-time visitors 