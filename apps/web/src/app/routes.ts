/**
 * 페이지 경로의 단일 출처 — 라우터 등록과 네비게이션 모두 이 상수를 사용한다.
 * 로그인은 라우트가 아니라 모달이다(LoginModal, MSG-46 후속 2 G7) — /login을 다시 만들지 말 것.
 */
export const ROUTES = {
  home: "/",
  // explore는 MSG-328에서 제거 — 지역 탐색·검색이 홈 좌측 패널로 통합됐다. 재추가 금지.
  upload: "/upload",
  dex: "/dex",
  profile: "/profile",
} as const;

/**
 * 카카오 OAuth 콜백 경로 (MSG-325) — 카카오 콘솔 등록값과 일치해야 한다.
 * 네비 섹션이 아니므로 ROUTES에 넣지 않는다(사이드레일 활성 판정 대상 밖).
 */
export const KAKAO_CALLBACK_PATH = "/oauth/kakao/callback";

/**
 * 알림 설정 상세 경로 (MSG-409) — /profile 하위 설정 상세 패널. 네비 섹션이 아니므로
 * ROUTES에 넣지 않는다(KAKAO_CALLBACK_PATH 전례). 사이드레일 활성 탭은
 * getActiveNavKey의 prefix 매칭이 프로필로 유지한다 (AC 1).
 */
export const NOTIFICATION_SETTINGS_PATH = "/profile/notifications";

export type NavKey = keyof typeof ROUTES;

/** 외부에서 넘어온 문자열 key가 네비 키인지 좁히는 타입 가드 */
export const isNavKey = (key: string): key is NavKey => key in ROUTES;

/** 현재 pathname이 속한 네비 섹션 키를 반환한다. 매칭되는 섹션이 없으면 undefined */
export const getActiveNavKey = (pathname: string): NavKey | undefined => {
  if (pathname === ROUTES.home) return "home";
  const entries = Object.entries(ROUTES) as [NavKey, string][];
  return entries.find(
    ([key, path]) =>
      key !== "home" && (pathname === path || pathname.startsWith(`${path}/`)),
  )?.[0];
};
