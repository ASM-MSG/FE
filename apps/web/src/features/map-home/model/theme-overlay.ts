import {
  cellBoundsAt,
  cellIndexAt,
  type Bounds,
  type CellOverlay,
  type LatLng,
} from "@/entities/cell";
import { isGridCellCenterInBusan } from "./grid-overlay";
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
 * MSG-263 개정(D5): 셀 bounds는 500m 근사(cellToBounds)가 아니라 100m 격자 스냅
 * (cellBoundsAt∘cellIndexAt)이고, 셀 중심이 부산 행정경계 밖인 셀은 대상에서 제외한다(AC 4).
 * MSG-263 개정 2(D9): 기본 점령 셀은 셸 상시 층(MapShell → buildOccupiedGridCells)으로 분리 —
 * 여기서는 테마 셀(빗금 포함)만 게시한다. 교집합 1회 렌더는 셸의 excludeSectionCells가 맡는다(AC 8).
 */

/** 스타일드 셀 오버레이 — color·hatched·occupied 미지정이면 기존 primary 렌더 그대로 (MapCanvas 계약, AC 13) */
export interface StyledCellOverlay extends CellOverlay {
  /** 채움·테두리 색 (테마 토큰 hex) — 미지정 시 primary */
  color?: string;
  /** 빗금 표시 여부 — 테마 셀 ∩ 내 점령 셀 (AC 7) */
  hatched?: boolean;
  /** 점령 셀 스타일 (MSG-263 AC 10 — Figma: primary 채움 18% + 실선 테두리 40%) */
  occupied?: boolean;
}

/** 내 점령 셀 입력 — CollectedCell(entities/dex)의 구조적 부분집합 */
export interface OccupiedCell {
  gridId: string;
  center: LatLng;
}

/**
 * 활성 테마 + 테마 셀 + 내 점령 셀 → 지도 게시용 테마 오버레이 목록. [AC 2·6·7·8]
 * - 비활성: 빈 목록 — 기본 점령 표시는 셸 상시 층 소유 (MSG-263 개정 2 D9)
 * - 핫구역·지역축제·팝업스토어: 테마 셀을 테마 색으로, 교집합(∩ 내 점령)은 빗금
 * - 경로추천: 경로 주변 셀을 경로 색으로 — 교집합 빗금 규칙 동일 (Figma 정본 13848:8440, 검증 재작업 1)
 * 교집합 셀은 테마 스타일 쪽으로만 1회 그려진다 — 셸이 게시 id와 겹치는 상시 점령 셀을 제외한다(AC 8).
 */
export const buildHomeOverlayCells = (
  activeTheme: ThemeId | null,
  themeCells: ThemeCell[],
  occupiedCells: OccupiedCell[],
): StyledCellOverlay[] => {
  if (activeTheme === null) return [];

  const occupiedIds = new Set(occupiedCells.map((c) => c.gridId));
  return themeCells
    .filter((c) => isGridCellCenterInBusan(c.center))
    .map((c) => ({
      id: c.id,
      bounds: cellBoundsAt(cellIndexAt(c.center)),
      color: THEME_META[activeTheme].color,
      hatched: occupiedIds.has(c.id),
    }));
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

/** 빗금 선분 개수 기본값 — 셀 폭 안에서 선 간격이 시각적으로 구분되는 밀도 (MSG-263: 100m 셀에도 유지) */
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
