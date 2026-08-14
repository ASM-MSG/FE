import { palette } from "@fillmap/design-tokens";
import type { LatLng } from "@/entities/cell";

/**
 * 지도 홈 테마 필터 도메인 (MSG-252 AC 1·3).
 * 순수 데이터/타입 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 아이콘은 플랫폼 산출물(react 컴포넌트)이라 여기 두지 않는다 — 칩 뷰(ThemeChipsBar)가 매핑한다.
 *
 * MSG-395: 목 테마 셀·목 경로(MOCK_THEME_CELLS·MOCK_ROUTE·themeCellsOf)는 실 미션 API
 * (`/api/missions/active`) 전환으로 제거됐다 — 강조 격자는 핫구역이 `use-hotzones-query`,
 * 나머지 3테마가 `mission.ts`에서 온다. 여기 남은 것은 칩 정체성(순서·라벨·색)뿐이다.
 */

/** 테마 식별자 — 칩 4개와 1:1 */
export type ThemeId = "hot" | "festival" | "popup" | "route";

/** 칩 표시 순서 (AC 1 — 핫구역 · 지역축제 · 팝업스토어 · 경로추천) */
export const THEME_ORDER: readonly ThemeId[] = [
  "hot",
  "festival",
  "popup",
  "route",
];

export interface ThemeMeta {
  label: string;
  /** 테마 색 — design-tokens 신규 테마 토큰만 경유한다 (A1, hex 임의값 금지) */
  color: string;
}

/** 테마 메타 — 라벨·색 (AC 1·3). 색 값의 출처는 design-tokens palette 단일 */
export const THEME_META: Record<ThemeId, ThemeMeta> = {
  hot: { label: "핫구역", color: palette["theme-hot"] },
  festival: { label: "지역축제", color: palette["theme-festival"] },
  popup: { label: "팝업스토어", color: palette["theme-popup"] },
  route: { label: "경로추천", color: palette["theme-route"] },
};

/** 테마 강조 대상 셀 — 격자 id + 중심 좌표 */
export interface ThemeCell {
  id: string;
  center: LatLng;
}
