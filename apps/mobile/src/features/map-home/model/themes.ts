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

/**
 * 홈 상단 상태 — 검색바 + 칩 행. 칩 행은 테마 선택 여부와 무관하게 항상 보인다.
 *
 * MSG-298의 "칩 선택 → 칩 행 숨김 + 테마 검색어 바(<·테마명·X)"는 Figma 정본 v2
 * (14851:390)와 정면 충돌해 MSG-423 요구 4로 폐기됐다 — 선택 칩만 테마 색으로 채워지고
 * 나머지 칩은 그대로 보여야 하기 때문이다. 테마 해제 X는 시트 헤더로 옮겨간다(MSG-427).
 */
export interface HomeTopBar {
  showChips: true;
}

/**
 * 테마 선택 상태 → 상단 바 파생 (MSG-423 L8) — 어떤 테마에서도 칩 행을 표시한다.
 * 상태와 무관해진 지금도 화면이 이 파생을 경유하는 이유는, 상단 바 구성이 다시
 * 테마에 따라 갈릴 때(MSG-427 시트 헤더 pill) 바꿀 곳을 한 군데로 남겨두기 위함이다.
 */
export const deriveHomeTopBar = (_theme: ThemeId | null): HomeTopBar => ({
  showChips: true,
});
