/** 페이지 경로의 단일 출처 — 라우터 등록과 네비게이션 모두 이 상수를 사용한다 */
export const ROUTES = {
  home: "/",
  explore: "/explore",
  upload: "/upload",
  dex: "/dex",
  profile: "/profile",
} as const;

export type NavKey = keyof typeof ROUTES;

/** 현재 pathname이 속한 네비 섹션 키를 반환한다. 매칭되는 섹션이 없으면 undefined */
export const getActiveNavKey = (pathname: string): NavKey | undefined => {
  if (pathname === ROUTES.home) return "home";
  const entries = Object.entries(ROUTES) as [NavKey, string][];
  return entries.find(
    ([key, path]) =>
      key !== "home" &&
      (pathname === path || pathname.startsWith(`${path}/`)),
  )?.[0];
};
