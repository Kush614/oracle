import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oracle — Attested Resolution',
  description: 'Five-agent tournament for prediction market resolution. Every verdict is a cited.md.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-oracle-bg text-oracle-ink font-mono min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
