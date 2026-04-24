import './globals.css';
import type { Metadata } from 'next';
import { Archivo_Black, Inter_Tight } from 'next/font/google';

const display = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap'
});

const sans = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Oracle — Attested Resolution',
  description:
    'Five-agent tournament for prediction market resolution. Every verdict is a cited.md.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-oracle-bg text-oracle-ink font-sans min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
