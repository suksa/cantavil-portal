import type { Metadata } from 'next';
import FaqClient from './FaqClient';

// 로그인 없이 열리는 공개 페이지입니다. (proxy.ts 의 인증 게이트는 /dashboard,
// /inspect, /admin 만 막으므로 /faq 는 누구나 접근 가능 — 단톡방에 링크를
// 공유하면 입주민이 바로 들어올 수 있습니다.)
export const metadata: Metadata = {
  title: '입주 도우미 · 자주 묻는 질문',
  description:
    '신검단중앙역 칸타빌 더 스위트 입주민 단톡방에서 자주 나온 질문을 모아둔 도우미입니다. 입주·잔금·대출·하자 등 반복 질문을 키워드로 찾아보세요.',
};

export default function FaqPage() {
  return <FaqClient />;
}
