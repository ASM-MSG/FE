import {
  CELL_SIDE_METERS,
  cellToBounds,
  type Bounds,
  type CellOverlay,
  type LatLng,
} from "@/entities/cell";
import {
  THEME_META,
  type MockRoute,
  type RouteWaypoint,
  type ThemeCell,
  type ThemeId,
} from "./theme";

/**
 * 테마 오버레이 파생 (MSG-252 AC 2·6·7·8).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 렌더링(naver Polygon·Polyline·Marker)은 MapCanvas 경계 안에서 하고, 여기는 데이터만 만든다.
 */

/** 스타일드 셀 오버레이 — color·hatched 미지정이면 기존 primary 렌더 그대로 (MapCanvas 계약, AC 13) */
export interface StyledCellOverlay extends CellOverlay {
  /** 채움·테두리 색 (테마 토큰 hex) — 미지정 시 primary */
  color?: string;
  /** 빗금 표시 여부 — 테마 셀 ∩ 내 점령 셀 (AC 7) */
  hatched?: boolean;
}

/** 내 점령 셀 입력 — CollectedCell(entities/dex)의 구조적 부분집합 */
export interface OccupiedCell {
  cellId: string;
  center: LatLng;
}

/**
 * 활성 테마 + 테마 셀 + 내 점령 셀 → 지도 게시용 스타일드 오버레이 목록. [AC 2·6·7·8]
 * - 비활성: 내 점령 셀만, 스타일 미지정(기존 primary 렌더) — 홈 기본 표시 (R3 신규 동작)
 * - 핫구역·지역축제·팝업스토어: 테마 셀은 테마 색, 교집합은 빗금. 테마 밖 점령 셀은 기본 유지
 * - 경로추천: 경로 주변 셀을 경로 색으로 — 교집합 빗금 규칙 동일 (Figma 정본 13848:8440, 검증 재작업 1)
 * 교집합 셀은 테마 스타일 쪽으로만 1회 게시한다 (이중 폴리곤 방지).
 */
export const buildHomeOverlayCells = (
  activeTheme: ThemeId | null,
  themeCells: ThemeCell[],
  occupiedCells: OccupiedCell[],
): StyledCellOverlay[] => {
  const activeThemeCells = activeTheme === null ? [] : themeCells;
  const themeIds = new Set(activeThemeCells.map((c) => c.id));
  const occupiedIds = new Set(occupiedCells.map((c) => c.cellId));

  const base: StyledCellOverlay[] = occupiedCells
    .filter((c) => !themeIds.has(c.cellId))
    .map((c) => ({
      id: c.cellId,
      bounds: cellToBounds(c.center, CELL_SIDE_METERS),
    }));

  if (activeTheme === null) return base;

  const themed: StyledCellOverlay[] = activeThemeCells.map((c) => ({
    id: c.id,
    bounds: cellToBounds(c.center, CELL_SIDE_METERS),
    color: THEME_META[activeTheme].color,
    hatched: occupiedIds.has(c.id),
  }));

  return [...base, ...themed];
};

/** 지도 게시용 경로 오버레이 — 연결선 정점 + 번호 경유지 + 경로 색 (AC 8) */
export interface RouteOverlay {
  path: LatLng[];
  waypoints: RouteWaypoint[];
  color: string;
}

/** 경로추천 활성 시에만 경로를 게시한다 — 그 외에는 null (AC 8, 표시 전용) */
export const buildRouteOverlay = (
  activeTheme: ThemeId | null,
  route: MockRoute,
): RouteOverlay | null =>
  activeTheme === "route"
    ? {
        path: route.path,
        waypoints: route.waypoints,
        color: THEME_META.route.color,
      }
    : null;

/** 빗금 선분 개수 기본값 — 500m 셀에서 선 간격이 시각적으로 구분되는 밀도 */
export const HATCH_LINE_COUNT = 5;

/**
 * 셀 Bounds 안 사선 빗금 선분 목록. [AC 7, R1]
 * 네이버 Polygon은 패턴 채움을 지원하지 않아 사선 Polyline 묶음으로 빗금을 근사한다 —
 * 정규화 좌표(0~1)에서 x+y=s (s∈(0,2)) 반대각 평행선을 사각형 경계로 절단한 것.
 */
export const buildHatchLines = (
  bounds: Bounds,
  lineCount: number = HATCH_LINE_COUNT,
): [LatLng, LatLng][] => {
  const dLat = bounds.ne.lat - bounds.sw.lat;
  const dLng = bounds.ne.lng - bounds.sw.lng;

  return Array.from({ length: lineCount }, (_, i) => {
    const s = (2 * (i + 1)) / (lineCount + 1);
    const x1 = Math.max(0, s - 1);
    const x2 = Math.min(1, s);
    return [
      { lat: bounds.sw.lat + (s - x1) * dLat, lng: bounds.sw.lng + x1 * dLng },
      { lat: bounds.sw.lat + (s - x2) * dLat, lng: bounds.sw.lng + x2 * dLng },
    ];
  });
};
