import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'TesTicTour - TFT Tournament Platform',
  description: 'Register, compete, and track your progress in Teamfight Tactics tournaments around the world.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}