import type { MetadataRoute } from 'next';

// Makes the portal installable ("홈 화면에 추가"). App-shell only — no offline
// data sync (the app has no local DB by design).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '칸타빌 입주자 점검 포털',
    short_name: '칸타빌 점검',
    description: '동·호수와 본인 정보만으로 사전점검 하자 내역과 처리 상태를 확인합니다.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#08080b',
    theme_color: '#08080b',
    lang: 'ko',
    icons: [
      { src: '/zudy.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/zudy.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
