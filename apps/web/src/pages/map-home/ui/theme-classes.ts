import type { ThemeId } from "@/features/map-home/model/theme";

/**
 * 테마별 토큰 클래스 리터럴 표 (MSG-395) — 칩 바·피드 패널이 각자 갖고 있던 표를
 * 소비처가 6곳으로 늘며 한곳으로 모았다.
 *
 * tailwind는 클래스를 **정적 스캔**하므로 `bg-theme-${id}` 같은 동적 조립은 빌드에서
 * 클래스가 사라진다 — 반드시 리터럴로 적는다.
 */

/** 연한 배경 pill (배지) */
export const THEME_BADGE_CLASS: Record<ThemeId, string> = {
  hot: "bg-theme-hot/10 text-theme-hot",
  festival: "bg-theme-festival/10 text-theme-festival",
  popup: "bg-theme-popup/10 text-theme-popup",
  route: "bg-theme-route/10 text-theme-route",
};

/** 채움 배경 (진행 바·순번 배지·도트) */
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

/** 호버·선택 테두리 (카드 강조) */
export const THEME_HOVER_BORDER_CLASS: Record<ThemeId, string> = {
  hot: "hover:border-theme-hot",
  festival: "hover:border-theme-festival",
  popup: "hover:border-theme-popup",
  route: "hover:border-theme-route",
};

/** 이미지 자리 폴백 배경 (imageUrl null) */
export const THEME_PLACEHOLDER_CLASS: Record<ThemeId, string> = {
  hot: "bg-theme-hot/10",
  festival: "bg-theme-festival/10",
  popup: "bg-theme-popup/10",
  route: "bg-theme-route/10",
};
