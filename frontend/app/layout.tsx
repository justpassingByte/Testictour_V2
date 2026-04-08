import { Space_Grotesk, Cinzel_Decorative } from 'next/font/google';
import './globals.css';
import { Metadata } from 'next';

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space',
});

const cinzel = Cinzel_Decorative({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-cinzel',
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
    <html lang="en" className={`${spaceGrotesk.variable} ${cinzel.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}