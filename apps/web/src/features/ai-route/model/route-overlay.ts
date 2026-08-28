import { palette } from "@fillmap/design-tokens";
import { decodeGridCorners } from "@/entities/cell";
import type {
  RouteOverlay,
  StyledCellOverlay,
} from "@/features/map-home/model/theme-overlay";
import type { RoutePointDto } from "@/shared/api/generated";

/**
 * 추천 지점 → 지도 게시 오버레이 파생 (MSG-488 L6).
 * 순수 함수 — 렌더(naver Polyline·Marker·Polygon)는 MapCanvas 경계 안에서만 한다(RN 경계, R7).
 * 오버레이 타입 3종은 `map-overlay-store`와 같은 계약(theme-overlay)을 type-only로 쓴다(Q4).
 *
 * [MSG-490 확장점] `path`가 walk-paths 실보행 폴리라인으로 교체된다 — 직선은 폴백으로 남는다.
 */

/** 게시 경로 오버레이 id — AI 추천은 항상 한 줄이라 고정 id다 (코스 목록과 달리 다중 아님) */
export const AI_ROUTE_OVERLAY_ID = "ai-route";

/** 오버레이 파생 입력 — 순서·좌표·격자만 쓴다 */
type RouteStopGeometry = Pick<
  RoutePointDto,
  "order" | "lat" | "lng" | "gridId"
>;

export interface AiRouteOverlay {
  routes: RouteOverlay[];
  cells: StyledCellOverlay[];
}

/**
 * 경로선 + 번호 경유지 + 지점 격자 초록 틴트 (L6).
 * - 지점이 없으면 둘 다 빈 배열이다 — 이전 표시가 걷힌다 (Q10)
 * - 격자는 gridId 중복을 제거한다 (한 격자에 지점 둘이면 셀 하나)
 * - 내 점령 격자와 겹치면 빗금 (홈 테마 셀 규칙과 동일)
 */
export const buildAiRouteOverlay = (
  points: RouteStopGeometry[],
  occupiedGridIds: string[],
  selectedOrder: number | null = null,
): AiRouteOverlay => {
  if (points.length === 0) return { routes: [], cells: [] };

  const ordered = [...points].sort((a, b) => a.order - b.order);
  const occupied = new Set(occupiedGridIds);

  const seen = new Set<string>();
  const cells: StyledCellOverlay[] = [];
  for (const point of ordered) {
    if (seen.has(point.gridId)) continue;
    seen.add(point.gridId);
    cells.push({
      id: point.gridId,
      corners: decodeGridCorners(point.gridId),
      color: palette["theme-route"],
      hatched: occupied.has(point.gridId),
    });
  }

  return {
    routes: [
      {
        id: AI_ROUTE_OVERLAY_ID,
        path: ordered.map(({ lat, lng }) => ({ lat, lng })),
        waypoints: ordered.map(({ order, lat, lng }) => ({
          seq: order,
          position: { lat, lng },
          active: order === selectedOrder,
        })),
        color: palette["theme-route"],
      },
    ],
    cells,
  };
};
