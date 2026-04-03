import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/routing';

// Middleware xử lý các URL có chứa locale
export default createMiddleware({
  // A list of all locales that are supported
  locales: locales,
  // Used when no locale matches
  defaultLocale: defaultLocale,
  // Force always include locale in URL
  localePrefix: 'always',
  // Để debug
  localeDetection: true
});

// Xác định các pattern cần áp dụng middleware
export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except those starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico, robots.txt, etc.
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)'
  ]
}; 