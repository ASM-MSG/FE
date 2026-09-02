import type { LatLng } from "../../../entities/cell/model/grid";
import type { RoutePointDto } from "../../../shared/api/sdk";
import type { RouteWaypoint } from "../../map-home/model/route-overlay";

/**
 * 추천 지점 → 지도 오버레이 재료 파생 (L8, MSG-556) — 순수 함수.
 * 웹 `route-overlay.ts`의 **모바일 고유 재작성**이다: 웹은 `StyledCellOverlay(corners·color·
 * hatched)`를 만들지만 모바일 `GridMap`은 `themeCells`·`hatchCells`·`route` 3층을 받는다.
 * 셀 분류(테마 전용/교집합)는 기존 `mission-cells.classifyCells(toMissionCells(gridIds), occupied)`가
 * 맡고, 여기는 **순서·중복·선택**만 정한다. 파생 규칙의 웹 동등성은 ai-route-overlay.parity.test.ts.
 *
 * Hermes 미구현 API 금지 구역 — `[...arr].sort()` 유지 (oxlint 강제).
 */

/** 오버레이 파생 입력 — 순서·좌표·격자만 쓴다 */
type RouteStopGeometry = Pick<
  RoutePointDto,
  "order" | "lat" | "lng" | "gridId"
>;

export interface AiRouteOverlay {
  /** 지점 격자 id — order 순서 유지, 중복 제거 (한 격자에 지점 둘이면 셀 하나) */
  gridIds: string[];
  /** 경로선 정점 — order 순 직선. [MSG-490 확장점] 실보행 좌표열로 교체된다 */
  path: LatLng[];
  /** 번호 경유지 — `active`는 선택 강조 (카드↔마커 양방향, D8) */
  waypoints: RouteWaypoint[];
}

const EMPTY: AiRouteOverlay = { gridIds: [], path: [], waypoints: [] };

export const buildAiRouteOverlay = (
  points: RouteStopGeometry[],
  selectedOrder: number | null,
): AiRouteOverlay => {
  if (points.length === 0) return EMPTY;

  const ordered = [...points].sort((a, b) => a.order - b.order);
  const seen = new Set<string>();
  const gridIds: string[] = [];
  for (const { gridId } of ordered) {
    if (seen.has(gridId)) continue;
    seen.add(gridId);
    gridIds.push(gridId);
  }

  return {
    gridIds,
    path: ordered.map(({ lat, lng }) => ({ lat, lng })),
    waypoints: ordered.map(({ order, lat, lng }) => ({
      seq: order,
      coord: { lat, lng },
      active: order === selectedOrder,
    })),
  };
};
