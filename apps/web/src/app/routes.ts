/** 페이지 경로의 단일 출처 — 라우터 등록과 네비게이션 모두 이 상수를 사용한다 */

/** SideRail 네비 섹션 경로 — 네비 키 판별(isNavKey·getActiveNavKey)은 이 목록만 대상 */
export const NAV_ROUTES = {
  home: "/",
  explore: "/explore",
  upload: "/upload",
  dex: "/dex",
  profile: "/profile",
} as const;

/** 전체 라우트 = 네비 섹션 + 독립 페이지. login은 셸 밖 진입점이라 네비 섹션이 아니다(MSG-46) */
export const ROUTES = {
  ...NAV_ROUTES,
  login: "/login",
} as const;

export type NavKey = keyof typeof NAV_ROUTES;

/** 외부에서 넘어온 문자열 key가 네비 키인지 좁히는 타입 가드 */
export const isNavKey = (key: string): key is NavKey => key in NAV_ROUTES;

/** 현재 pathname이 속한 네비 섹션 키를 반환한다. 매칭되는 섹션이 없으면 undefined */
export const getActiveNavKey = (pathname: string): NavKey | undefined => {
  if (pathname === NAV_ROUTES.home) return "home";
  const entries = Object.entries(NAV_ROUTES) as [NavKey, string][];
  return entries.find(
    ([key, path]) =>
      key !== "home" &&
      (pathname === path || pathname.startsWith(`${path}/`)),
  )?.[0];
};
