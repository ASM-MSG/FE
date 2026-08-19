/**
 * 지도 홈 테마 칩 4종의 모델 정의 + 상단 바 상태 파생 (MSG-298 AC 5).
 * 화면의 칩 배열·검색어 바 표시는 전부 이 모델에서 파생한다 — 순수 모델(RN 비의존).
 * 색은 design-tokens 테마 원시 토큰(theme-hot·festival·popup·route)이 정본.
 */
import { palette, spacing } from "@fillmap/design-tokens";

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

/** 검색바 높이 — ui-native `SearchBar`의 `h-12` (NativeWind 스케일이 정본) */
const SEARCH_BAR_HEIGHT = 48;
/** 테마 칩 높이 — `ThemeChip`의 `h-9.5` (웹 정본과 동일, NativeWind 스케일이 정본) */
const THEME_CHIP_HEIGHT = 38;

/**
 * safe-area 아래에서 시작하는 홈 상단 바(검색바 + 칩 행)의 실높이(px) — 지도 위
 * 오버레이가 상단 바를 피해 앉기 위한 세로 오프셋이다. 화면은 이 값을
 * `insets.top + HOME_TOP_BAR_HEIGHT`로 더해 쓴다 (safe-area는 기기별 런타임 값).
 *
 * 매직 넘버가 아니라 구성 요소의 합으로 둔다: 간격은 design-tokens `spacing`에서
 * 실제로 가져오고, 컴포넌트 높이는 NativeWind className이 정본이라 import할 수 없어
 * 출처 클래스를 상수 주석에 남긴다(해당 클래스를 바꾸면 여기도 바꾼다).
 *
 * 칩 행이 숨겨지면 높이가 달라지지만, `deriveHomeTopBar`가 L8에 의해 테마 선택과
 * 무관하게 항상 `showChips: true`를 반환하므로 칩 행은 상시 존재하고 이 합은 상수다.
 */
export const HOME_TOP_BAR_HEIGHT =
  spacing.sm + // 상단 바 `pt-sm` (map-home-screen 검색바 행)
  SEARCH_BAR_HEIGHT +
  spacing.sm + // 칩 행 `mt-sm` (ThemeChipsBar)
  THEME_CHIP_HEIGHT;
