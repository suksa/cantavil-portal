# Cantavil The Suite — Resident Portal (Mirror)

신검단중앙역 칸타빌 더 스위트 입주자 점검 미러 서비스. 원본(`m4.dtspace.co.kr`)의 입주자 영역을
Next.js 14 App Router로 깔끔하게 다시 만들어 단지/동·호수/이름/전화번호 만으로 사전점검 하자
내역을 빠르게 조회할 수 있도록 합니다.

## 주요 기능

- **단일 페이지 로그인**: 단지(고정: 칸타빌 더 스위트) / 동·호수 / 이름 / 전화번호. 클라이언트
  + 서버 양쪽에서 zod 검증.
- **서버 사이드 세션 미러링**: `/api/login`이 dtspace `POST /v1/customer/login`을 호출하여 `CSTM_LOGIN_KEY`
  JWT를 받아 HttpOnly 쿠키(`cantavil_session`)에 저장. 클라이언트는 절대 JWT를 보지 못합니다.
- **하자 내역 통합 뷰**: 접수 / 작업완료 / 재접수 / 최종완료 4개 탭. 상세 페이지 없이 카드 형태
  안에서 모든 메타데이터(분류·시공사·작업자·메모·날짜)와 첨부 사진을 인라인으로 표시.
- **풀스크린 라이트박스**: 첨부 사진 클릭 → 좌/우 화살표 키, 모바일 스와이프, ESC로 닫기.
- **3D 파티클 로고**: Three.js로 CANTAVIL 워드마크를 GPU 파티클로 형성/유지·마우스 패럴랙스.
- **Supabase-스타일 다크 UI**: 검은 베이스 + Cantavil 레드(#f12a37) 액센트 + 글래스 표면.
- **반응형**: 360px(모바일)부터 데스크탑까지 한 손 + 양손 사용성을 모두 고려.

## 빠른 시작

```bash
npm install
npm run dev
# http://localhost:3000
```

`.env.local` (선택):

```ini
DTSPACE_BASE_URL=https://m4.dtspace.co.kr
CANTAVIL_SITE_CODE=DC0003
```

## 테스트 계정 (사용자 제공)

- 동: 105 (내부 코드 93078)
- 호: 0502
- 이름: 조찬형
- 전화번호: 010-7900-5451

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
│     ├─ login/route.ts           프록시 로그인 (HttpOnly 세션 발급)
│     ├─ logout/route.ts          세션 파기
│     └─ flaws/route.ts           SSE 스트림 파싱 → JSON
├─ src/components
│  ├─ LogoParticles.tsx           Three.js 파티클 로고
│  ├─ LoginForm.tsx
│  ├─ TabBar.tsx
│  ├─ FlawCard.tsx
│  └─ Lightbox.tsx
├─ src/lib
│  ├─ dtspace.ts                  업스트림 API 클라이언트
│  ├─ session.ts                  쿠키 직렬화
│  ├─ schema.ts                   zod 스키마 + 포맷터
│  └─ types.ts
└─ src/middleware.ts              /dashboard 보호
```

## 카테고리 매핑 (역공학으로 확인됨)

| dtspace `cdHndlStat` | 표시 탭 |
| -------------------- | -------- |
| `A` 또는 `E`         | 접수     |
| `B`                  | 작업완료 |
| `C`                  | 재접수   |
| `D`                  | 최종완료 |

`ynReRcpt === 'Y'` 항목은 카테고리와 무관하게 재접수 탭으로 분류됩니다.

## 배포 — Vercel

1. GitHub에 푸시
2. Vercel 대시보드 → New Project → 해당 repo 선택
3. 환경변수는 기본값으로 충분 (필요 시 `DTSPACE_BASE_URL`, `CANTAVIL_SITE_CODE` 추가)
4. Deploy. 별도 빌드 명령/출력 디렉토리 설정 불필요.

> 참고: `/api/flaws` 응답은 첨부 사진을 모두 base64로 인라인 포함하므로 5MB 안팎이 됩니다.
> Vercel Hobby에서도 무료 한도 안에서 정상 동작하지만, 트래픽이 늘면 Edge Cache/ISR 고려.

## 보안 메모

- 입주자 자격증명(이름/전화번호/동호수)은 서버 응답에만 일시 보관되며 어떤 영구 저장소에도
  기록되지 않습니다.
- 세션 쿠키는 HttpOnly + SameSite=Lax. 프로덕션에서 자동으로 Secure 플래그.
- `/dashboard` 라우트는 Next.js 미들웨어로 차단됩니다.
- 점검등록 같은 쓰기 동작은 의도적으로 구현하지 않았습니다 — 미러는 **읽기 전용**입니다.

## 알려진 한계

- dtspace 측 dtspace `dong` 식별자는 내부 코드(예: 93078)이므로 화면 표시용 동 번호는 부트 시점에
  매핑됩니다.
- 사진은 원본 응답에 base64로 포함되어 있어 첫 로드가 다소 무겁습니다. 새로고침 버튼으로 동일
  스냅샷을 다시 가져올 수 있습니다.
