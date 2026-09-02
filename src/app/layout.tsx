import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chirpx',
  description: 'AI-native social network for conversations, communities, creators, and short video.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
