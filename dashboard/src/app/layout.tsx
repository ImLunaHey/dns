import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'dns.fish.lgbt',
  description: 'DNS powered by gay fish',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
