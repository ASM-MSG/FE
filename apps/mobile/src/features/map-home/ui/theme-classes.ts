import type { ThemeId } from "../model/themes";

/**
 * 테마별 토큰 클래스 리터럴 표 (MSG-427) — 웹 `pages/map-home/ui/theme-classes.ts` 미러.
 *
 * tailwind는 클래스를 **정적 스캔**하므로 `bg-theme-${id}` 같은 동적 조립은 빌드에서
 * 클래스가 사라진다 — 반드시 리터럴로 적는다. hex 리터럴·임의값을 쓰지 않는 경로다 (F7).
 */

/** 연한 배경 pill (배지·완료 조건 배너) */
export const THEME_BADGE_CLASS: Record<ThemeId, string> = {
  hot: "bg-theme-hot/10",
  festival: "bg-theme-festival/10",
  popup: "bg-theme-popup/10",
  route: "bg-theme-route/10",
};

/** 채움 배경 (진행 바·순번 원·막대) */
export const THEME_FILL_CLASS: Record<ThemeId, string> = {
  hot: "bg-theme-hot",
  festival: "bg-theme-festival",
  popup: "bg-theme-popup",
  route: "bg-theme-route",
};

/** 글자색 */
export const THEME_TEXT_CLASS: Record<ThemeId, string> = {
  hot: "text-theme-hot",
  festival: "text-theme-festival",
  popup: "text-theme-popup",
  route: "text-theme-route",
};

/** 방문 행 강조 배경 — 연테마색 (E8) */
export const THEME_ROW_CLASS: Record<ThemeId, string> = {
  hot: "bg-theme-hot/5",
  festival: "bg-theme-festival/5",
  popup: "bg-theme-popup/5",
  route: "bg-theme-route/5",
};
