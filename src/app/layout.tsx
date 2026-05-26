import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://cantavil-portal.vercel.app'),
  title: '주디의 놀이터',
  description:
    '동·호수와 본인 정보만으로 사전점검 하자 내역과 처리 상태를 한 화면에서 확인합니다. 개인정보는 수집·저장하지 않습니다.',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'zudy play',
    title: '주디의 놀이터',
    description:
      '동·호수와 본인 정보만으로 사전점검 하자 내역과 처리 상태를 한 화면에서 확인합니다.',
  },
  twitter: {
    card: 'summary_large_image',
    title: '주디의 놀이터',
    description:
      '동·호수와 본인 정보만으로 사전점검 하자 내역과 처리 상태를 한 화면에서 확인합니다.',
  },
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
