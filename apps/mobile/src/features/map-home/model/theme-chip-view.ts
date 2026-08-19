import { palette, semantic } from "@fillmap/design-tokens";
import type { ThemeId } from "./themes";

/**
 * 테마 칩 4종의 표시값 파생 + 선택 토글 (MSG-423 요구 3·4) — 순수 모델.
 * 색 정본은 design-tokens 테마 원시 토큰(theme-hot·festival·popup·route)이고,
 * 웹 `pages/map-home/ui/ThemeChip`·`theme-filter-store.toggle`의 미러다.
 */

export interface ThemeChipView {
  /** 칩 배경 토큰 클래스 — 활성이면 테마 색, 비활성이면 흰 배경 */
  bg: string;
  /** 라벨 텍스트 토큰 클래스 */
  label: string;
  /** 아이콘 색 hex — RN은 currentColor 상속이 없어 값으로 전달한다 (ui-native Chip 관례) */
  icon: string;
}

/**
 * 테마별 활성 배경 클래스 리터럴 표 — tailwind는 클래스를 정적 스캔하므로
 * `bg-theme-${id}` 동적 조립을 쓸 수 없다 (웹 ThemeChipsBar CHIP_VIEW와 동일 이유).
 */
const ACTIVE_BG: Record<ThemeId, string> = {
  hot: "bg-theme-hot",
  festival: "bg-theme-festival",
  popup: "bg-theme-popup",
  route: "bg-theme-route",
};

/** 테마별 아이콘 정색 — 비활성 칩의 "컬러 아이콘" (요구 3) */
const ICON_COLOR: Record<ThemeId, string> = {
  hot: palette["theme-hot"],
  festival: palette["theme-festival"],
  popup: palette["theme-popup"],
  route: palette["theme-route"],
};

/**
 * 칩 하나의 표시값 — 활성이면 테마 색 채움 + 라벨·아이콘 흰색, 비활성이면
 * 흰 배경 + 기본 라벨색 + 테마 정색 아이콘 (요구 3·4).
 */
export const themeChipView = (id: ThemeId, active: boolean): ThemeChipView =>
  active
    ? {
        bg: ACTIVE_BG[id],
        label: "text-primary-foreground",
        icon: semantic.onPrimary,
      }
    : { bg: "bg-background", label: "text-foreground", icon: ICON_COLOR[id] };

/**
 * 칩 탭 → 다음 선택 상태 — 같은 칩 재탭이면 해제(null), 다른 칩이면 전환 (요구 4).
 * 시트 헤더의 해제 X는 MSG-427 소관이라 이번 티켓의 해제 수단은 재탭뿐이다 (승인 Q5).
 */
export const toggleTheme = (
  current: ThemeId | null,
  tapped: ThemeId,
): ThemeId | null => (current === tapped ? null : tapped);
