import { palette } from "@fillmap/design-tokens";
import { decodeGridCorners, type LatLng } from "@/entities/cell";
import type {
  RouteOverlay,
  StyledCellOverlay,
} from "@/features/map-home/model/theme-overlay";
import type { RoutePointDto } from "@/shared/api/generated";
import { alignWalkSegments, type WalkPathInput } from "./route-legs";

/**
 * 추천 지점 → 지도 게시 오버레이 파생 (MSG-488 L6).
 * 순수 함수 — 렌더(naver Polyline·Marker·Polygon)는 MapCanvas 경계 안에서만 한다(RN 경계, R7).
 * 오버레이 타입 3종은 `map-overlay-store`와 같은 계약(theme-overlay)을 type-only로 쓴다(Q4).
 *
 * `path`는 walk-paths 실보행 좌표열(MSG-490 L9)과 직선 폴백이 섞인 **한 줄**이다 — 해결된
 * 세그먼트만 도로를 따라 굽고 나머지는 두 끝점 직선으로 남는다. 응답 전·요청 실패는
 * MSG-488과 같은 order 순 직선이다(L10 회귀 고정).
 *
 * Hermes 미구현 API 금지 구역이다(RN 이식 대상 — `[...arr].sort()` 유지, MSG-427).
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

/** 마지막 점과 같은 좌표는 싣지 않는다 — 세그먼트 접점 중복 1개를 합치는 자리 (Q8) */
const pushPoint = (path: LatLng[], point: LatLng) => {
  const last = path[path.length - 1];
  if (last && last.lat === point.lat && last.lng === point.lng) return;
  path.push(point);
};

/**
 * 경로선 정점 목록 (L9·L10) — 해결된 세그먼트는 보행 좌표열, 나머지는 두 끝점 직선.
 * walk가 없거나 개수 계약이 깨졌으면 order 순 직선 그대로다.
 */
const buildRoutePath = (
  ordered: RouteStopGeometry[],
  walk?: WalkPathInput,
): LatLng[] => {
  const segments = alignWalkSegments(ordered.length - 1, walk);
  if (segments === null || ordered.length < 2) {
    return ordered.map(({ lat, lng }) => ({ lat, lng }));
  }

  const path: LatLng[] = [];
  ordered.slice(1).forEach((to, index) => {
    const from = ordered[index];
    const segment = segments[index];
    if (segment?.resolved === true && segment.path !== null) {
      for (const { lat, lng } of segment.path) pushPoint(path, { lat, lng });
      return;
    }
    pushPoint(path, { lat: from.lat, lng: from.lng });
    pushPoint(path, { lat: to.lat, lng: to.lng });
  });
  return path;
};

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
  walk?: WalkPathInput,
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
        path: buildRoutePath(ordered, walk),
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
