# Cantavil The Suite — Resident Portal

신검단중앙역 칸타빌 더 스위트 입주자 점검 포털. Next.js 14 App Router로 구축한 단일 페이지 진입
서비스로, 단지 · 동·호수 · 이름 · 전화번호 만으로 사전점검 하자 내역을 빠르게 확인할 수 있습니다.

## 주요 기능

- **단일 페이지 로그인**: 단지(고정: 칸타빌 더 스위트) / 동·호수 / 이름 / 전화번호. 클라이언트
  + 서버 양쪽에서 zod 검증.
- **안전한 서버 인증**: 본인 확인은 모두 서버에서 처리하고, 클라이언트에는 HttpOnly 쿠키만 노출.
- **하자 내역 통합 뷰**: 접수 / 작업완료 / 재접수 / 최종완료 4개 탭. 상세 페이지 없이 카드 형태
  안에서 모든 메타데이터(분류·시공사·작업자·메모·날짜)와 첨부 사진을 인라인으로 표시.
- **풀스크린 라이트박스**: 첨부 사진 클릭 → 좌/우 화살표 키, 모바일 스와이프, ESC로 닫기.
- **3D 파티클 로고**: Three.js로 CANTAVIL 워드마크를 GPU 파티클로 형성/유지·마우스 패럴랙스.
- **다크 UI**: 검은 베이스 + Cantavil 레드(#f12a37) 액센트 + 글래스 표면.
- **반응형**: 360px(모바일)부터 데스크탑까지 한 손 + 양손 사용성을 모두 고려.

## 빠른 시작

```bash
npm install
npm run dev
# http://localhost:3000
```

## 아키텍처

```
┌─ src/app
│  ├─ page.tsx                    로그인 페이지 (3D 로고 + 폼)
│  ├─ dashboard/                  로그인 이후 하자 내역
│  │  ├─ page.tsx                 서버 컴포넌트 (세션 가드)
│  │  └─ DashboardClient.tsx      탭/검색/카드 클라이언트
│  └─ api/
│     ├─ boot/route.ts            동 목록
│     ├─ ho/route.ts              호 목록
│     ├─ login/route.ts           본인 확인 + HttpOnly 세션 발급
│     ├─ logout/route.ts          세션 파기
│     └─ flaws/route.ts           점검 내역 조회
├─ src/components
│  ├─ LogoParticles.tsx           Three.js 파티클 로고
│  ├─ LoginForm.tsx
│  ├─ TabBar.tsx
│  ├─ FlawCard.tsx
│  └─ Lightbox.tsx
├─ src/lib
│  ├─ session.ts                  쿠키 직렬화
│  ├─ schema.ts                   zod 스키마 + 포맷터
│  └─ types.ts
└─ src/proxy.ts                   /dashboard 보호
```

## 카테고리 매핑

| 처리 상태  | 표시 탭 |
| ---------- | -------- |
| 접수 시점  | 접수     |
| 작업 완료  | 작업완료 |
| 재접수     | 재접수   |
| 최종 확인  | 최종완료 |

## 배포 — Vercel

1. GitHub에 푸시
2. Vercel 대시보드 → New Project → 해당 repo 선택
3. 환경변수는 기본값으로 충분
4. Deploy. 별도 빌드 명령/출력 디렉토리 설정 불필요.

## 보안 메모

- 입주자 자격증명(이름/전화번호/동호수)은 영구 저장소에 기록되지 않습니다.
- 세션 쿠키는 HttpOnly + SameSite=Lax. 프로덕션에서 자동으로 Secure 플래그.
- `/dashboard` 라우트는 Next.js 프록시로 차단됩니다.
- 점검등록 같은 쓰기 동작은 의도적으로 구현하지 않은 읽기 전용 포털입니다.
