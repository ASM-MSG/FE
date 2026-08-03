import { palette } from "@fillmap/design-tokens";
import { MOCK_CELLS, type LatLng } from "@/entities/cell";

/**
 * 지도 홈 테마 필터 도메인 (MSG-252 AC 1·3·6·8).
 * 순수 데이터/타입 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 아이콘은 플랫폼 산출물(react 컴포넌트)이라 여기 두지 않는다 — 칩 뷰(ThemeChipsBar)가 매핑한다.
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

/** 테마 강조 대상 셀 — 격자 id + 중심 좌표 (id·center는 MOCK_CELLS와 동기화) */
export interface ThemeCell {
  id: string;
  center: LatLng;
}

/** mock 정합 장치 — MOCK_CELLS에 없는 id를 테마에 넣는 실수를 로드 시점에 잡는다 (mock-dex cellById 패턴) */
const themeCellsFrom = (ids: string[]): ThemeCell[] =>
  ids.map((id) => {
    const cell = MOCK_CELLS.find((c) => c.id === id);
    if (!cell) throw new Error(`MOCK_CELLS에 없는 테마 셀 id: ${id}`);
    return { id, center: cell.center };
  });

/**
 * 테마별 목 셀 (부산 서면 일대 — MVP 규칙, 디자인의 안산 지명은 플레이스홀더).
 * 각 테마는 내 점령 셀(MOCK_COLLECTED_CELLS: A-14·B-08·B-07·C-02·A-15·G-03)과의
 * 교집합·비교집합을 모두 포함해 빗금 구분(AC 7)이 시연 가능하게 구성한다.
 * 실 API 전환 시 서버 제공 목록으로 교체한다 (제외 범위 — 티켓 명시).
 */
export const MOCK_THEME_CELLS: Record<
  Exclude<ThemeId, "route">,
  ThemeCell[]
> = {
  // 교집합 A-14·A-15·B-07 / 비교집합 G-04
  hot: themeCellsFrom(["A-14", "A-15", "B-07", "G-04"]),
  // 교집합 C-02·B-08 / 비교집합 D-01
  festival: themeCellsFrom(["C-02", "B-08", "D-01"]),
  // 교집합 A-15 / 비교집합 E-06·H-11
  popup: themeCellsFrom(["A-15", "E-06", "H-11"]),
};

/** 추천 경로 경유지 — 번호 마커(1·2·3)의 데이터 (AC 8) */
export interface RouteWaypoint {
  seq: number;
  position: LatLng;
}

/** 목 경로 — 경유지 + 연결선 정점 + 주변 셀. 경로 계산은 제외 범위라 전부 데이터로 보유 */
export interface MockRoute {
  waypoints: RouteWaypoint[];
  /** 연결선 정점 — 경유지를 순서대로 지나며 사이에 꺾임 정점을 둘 수 있다 */
  path: LatLng[];
  /** 경로 주변 강조 셀 (AC 8 — 초록 강조) */
  cells: ThemeCell[];
}

const ROUTE_CELLS = themeCellsFrom(["A-14", "A-15", "B-07"]);

/**
 * 목 추천 경로 (부산 서면: 서면 A-14 → 전포 A-15 → 부전 B-07).
 * 경유지 좌표는 해당 격자 중심과 동기화하고, 연결선은 거리 모양을 흉내 낸 꺾임 정점을 포함한다.
 */
export const MOCK_ROUTE: MockRoute = {
  waypoints: [
    { seq: 1, position: ROUTE_CELLS[0].center },
    { seq: 2, position: ROUTE_CELLS[1].center },
    { seq: 3, position: ROUTE_CELLS[2].center },
  ],
  path: [
    ROUTE_CELLS[0].center,
    { lat: 35.1558, lng: 129.0602 }, // 서면 → 전포 사이 꺾임
    ROUTE_CELLS[1].center,
    { lat: 35.1588, lng: 129.0641 }, // 전포 → 부전 사이 꺾임
    ROUTE_CELLS[2].center,
  ],
  cells: ROUTE_CELLS,
};

/** 활성 테마의 강조 셀 목록 — 경로추천은 경로 주변 셀 (AC 6·8) */
export const themeCellsOf = (theme: ThemeId): ThemeCell[] =>
  theme === "route" ? MOCK_ROUTE.cells : MOCK_THEME_CELLS[theme];
