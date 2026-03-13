import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'InBody Challenge',
  description: 'InBody Challenge - Transform Your Body',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          {children}
        </main>
      </body>
    </html>
  );
}
