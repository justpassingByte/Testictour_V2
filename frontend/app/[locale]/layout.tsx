import { Space_Grotesk, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { routing } from '../../i18n/routing';
import { setRequestLocale } from 'next-intl/server';
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { MainNav } from "@/components/main-nav";
import { Footer } from "@/components/footer";
import { Toaster } from "@/components/ui/toaster";
import LocaleDebug from './components/LocaleDebug';
import AuthClientWrapper from './components/AuthClientWrapper';
import { GlobalProviders } from '@/components/GlobalProviders';


const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// generateStaticParams will be handled by next-intl implicitly via i18n.ts
// export function generateStaticParams() {
//   return locales.map((locale: string) => ({ locale }));
// }

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {


  // Validate that the incoming locale is supported
  if (!routing.locales.includes(locale as any)) {
    console.error(`Unsupported locale: ${locale}, redirecting to 404`);
    notFound();
  }

  // Set the locale for Server Components
  setRequestLocale(locale);

  // Load messages directly instead of using getMessages()
  let messages;
  try {
    // Import directly from the locale file
    messages = {
      common: (await import(`../../locales/${locale}/common.json`)).default
    };


  } catch (error) {
    console.error(`[LocaleLayout] Error loading ${locale} messages:`, error);

    // Fallback to English if there's an error
    try {
      messages = {
        common: (await import(`../../locales/en/common.json`)).default
      };

    } catch (fallbackError) {
      console.error('[LocaleLayout] Even fallback failed:', fallbackError);
      messages = { common: {} };
    }
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={cn("min-h-screen font-sans antialiased text-base", spaceGrotesk.variable, inter.variable)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {/* Configure NextIntlClientProvider without function handlers */}
          <NextIntlClientProvider
            locale={locale}
            messages={messages}
            timeZone="UTC"
          >
            <GlobalProviders>
              <div className="relative flex min-h-screen flex-col">

                <MainNav />
                <main className="flex-1 min-h-[calc(100vh-theme(spacing.16)-theme(spacing.16))] ">
                  <AuthClientWrapper>{children}</AuthClientWrapper>
                </main>
                <Footer />
                {/* <LocaleDebug /> */}
              </div>
            </GlobalProviders>
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 