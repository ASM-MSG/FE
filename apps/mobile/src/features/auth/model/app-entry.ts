/**
 * 홈 로그인 게이트 판정 (MSG-561) — 앱은 로그인 필수. 순수 함수·상수만 두고
 * 진입점(`app/index.tsx`)과 루트 레이아웃(`app/_layout.tsx`)이 소비한다.
 * 플랫폼 API·라우터 무의존(RN 경계 규칙, `consent-gate.ts`와 같은 배치).
 */

/** 로그인 없이 도달 가능한 라우트 — 진입점·로그인·dev 로그인(실기 세션 확보, `__DEV__` 가드 있음) */
export const PUBLIC_ROUTES = ["index", "login", "dev/api-smoke"] as const;

/**
 * `Stack.Protected`에 등재되는 보호 라우트 — `src/app/**` 파일과 1:1 (`/index` 절단).
 * 여기 없는 라우트 파일은 공개가 되므로 `app-entry.test.ts`가 파일 목록과 대조한다 (D9).
 */
export const PROTECTED_ROUTES = [
  "home",
  "ai-route",
  "dex",
  "dex/history",
  "grid/[cellId]",
  "profile",
  "profile/consent",
  "profile/edit",
  "profile/reports",
  "search",
  "terms/[docKey]",
  "upload",
  "upload/analyzing",
  "upload/blur",
  "upload/highlight",
  "upload/preview",
  "video/[videoId]",
] as const;

export type AppEntry = "onboarding" | "login" | "home" | "resume";

interface EntryInput {
  onboardingCompleted: boolean;
  isAuthenticated: boolean;
  /** 이어갈 업로드 라우트 — 타입은 진입점이 알고 여기서는 유무만 본다 */
  resume: unknown;
}

/** 진입 판정 — 온보딩 → 로그인 → (이어가기 | 홈) 순으로 좁힌다 (D3·A1) */
export const resolveEntry = ({
  onboardingCompleted,
  isAuthenticated,
  resume,
}: EntryInput): AppEntry => {
  if (!onboardingCompleted) return "onboarding";
  if (!isAuthenticated) return "login";
  return resume === null ? "home" : "resume";
};

interface GuardInput {
  hydrated: boolean;
  isAuthenticated: boolean;
}

/**
 * 보호 라우트 가드 — 재수화 전에는 **열어 둔다** (D2). `guard={isAuthenticated}`로 두면
 * 콜드 스타트 딥링크·푸시 탭의 초기 라우트가 재수화 전에 네비게이터에서 버려져
 * 로그인 사용자까지 홈으로 퇴화한다. 비로그인은 재수화(수십 ms) 뒤 닫히며 스택째 제거된다.
 */
export const isRouteGuardOpen = ({
  hydrated,
  isAuthenticated,
}: GuardInput): boolean => !hydrated || isAuthenticated;
