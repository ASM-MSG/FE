/**
 * 지도 홈 테마 칩 4종의 모델 정의 + 상단 바 상태 파생 (MSG-298 AC 5).
 * 화면의 칩 배열·검색어 바 표시는 전부 이 모델에서 파생한다 — 순수 모델(RN 비의존).
 * 색은 design-tokens 테마 원시 토큰(theme-hot·festival·popup·route)이 정본.
 */
import { palette } from "@fillmap/design-tokens";

export type ThemeId = "hot" | "festival" | "popup" | "route";

export interface ThemeMeta {
  id: ThemeId;
  /** 칩 라벨 = 테마 검색어 바에 표시할 검색어 (AC 1) */
  label: string;
  /** 테마 원색 hex — 지도 오버레이·시트 배지·도트에 공통 사용 (AC 7·11) */
  color: string;
}

/** 칩 표시 순서 (Figma 14094:5025 좌→우) */
export const THEME_IDS: readonly ThemeId[] = [
  "hot",
  "festival",
  "popup",
  "route",
] as const;

export const THEME_META: Record<ThemeId, ThemeMeta> = {
  hot: { id: "hot", label: "핫구역", color: palette["theme-hot"] },
  festival: {
    id: "festival",
    label: "지역축제",
    color: palette["theme-festival"],
  },
  popup: { id: "popup", label: "팝업스토어", color: palette["theme-popup"] },
  route: { id: "route", label: "경로추천", color: palette["theme-route"] },
};

/** 홈 상단 상태 — 미선택: 검색바+칩 행 / 선택: 테마 검색어 바(<·테마명·X), 칩 행 숨김 */
export type HomeTopBar =
  | { mode: "default"; showChips: true }
  | { mode: "theme"; showChips: false; query: string };

/** 테마 선택 상태 → 상단 바 파생 (AC 5) — 결정적 계산 */
export const deriveHomeTopBar = (theme: ThemeId | null): HomeTopBar =>
  theme === null
    ? { mode: "default", showChips: true }
    : { mode: "theme", showChips: false, query: THEME_META[theme].label };
