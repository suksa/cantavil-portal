import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '신검단중앙역 칸타빌 더 스위트 · 입주자 점검 포털',
  description: '칸타빌 더 스위트 입주자 점검 포털',
  icons: { icon: '/logo_white.svg' },
};

export const viewport: Viewport = {
  themeColor: '#08080b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-brand-500/30">{children}</body>
    </html>
  );
}
