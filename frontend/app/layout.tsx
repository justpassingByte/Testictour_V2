import './globals.css';
import { Metadata } from 'next';

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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}