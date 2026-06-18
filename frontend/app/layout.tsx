import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustOps',
  description: 'Human-in-the-loop SOC case management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
