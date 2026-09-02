import { useMemo } from "react";
import type { GridCellIndex, LatLng } from "../../../entities/cell/model/grid";
import type {
  OccupiedGridResponseDto,
  RoutePointDto,
} from "../../../shared/api/sdk";
import {
  classifyCells,
  toMissionCells,
} from "../../map-home/model/mission-cells";
import { toOccupiedCells } from "../../map-home/model/occupied-grids";
import type { RouteWaypoint } from "../../map-home/model/route-overlay";
import { buildAiRouteOverlay } from "../model/ai-route-overlay";

/**
 * AI 추천 지도 오버레이 파생 (MSG-556 §1-3) — 스토어 points + 점령 격자 → `GridMap` prop.
 *
 * **뷰-레이어 훅이다** — `AiRouteScreen` 조립 전용이고 RN 재사용 대상이 아니다(파생은 전부
 * `model/`의 순수 함수이고 여기는 메모이제이션 배선만 한다). 홈 `use-home-overlays`와 같은
 * 규칙으로 3분류한다: 지점 격자만 → `themeCells`(초록 틴트), 점령과 교집합 → `hatchCells`(빗금).
 * 지도 SDK를 import하지 않는다 — 결과는 전부 플랫폼 중립 값이고 GridMap이 SDK로 번역한다.
 */
interface AiRouteOverlaysInput {
  points: RoutePointDto[];
  selectedOrder: number | null;
  occupiedGrids: OccupiedGridResponseDto[];
  /** 마커 탭 → 카드 선택 (D8) — 안정 참조로 넘겨야 route가 매 렌더 새로 만들어지지 않는다 */
  onWaypointTap: (seq: number) => void;
}

export interface AiRouteOverlays {
  /** 상시 점령 층 — 홈과 같이 항상 그린다 (빗금 밑 primary 채움의 재료) */
  occupiedCells: GridCellIndex[];
  themeCells: GridCellIndex[];
  hatchCells: GridCellIndex[];
  /** 경로선 + 번호 경유지(active 포함) — 지점이 없으면 undefined (오버레이가 걷힌다) */
  route:
    | {
        path: LatLng[];
        waypoints: RouteWaypoint[];
        onWaypointTap: (seq: number) => void;
      }
    | undefined;
}

export const useAiRouteOverlays = ({
  points,
  selectedOrder,
  occupiedGrids,
  onWaypointTap,
}: AiRouteOverlaysInput): AiRouteOverlays => {
  const occupiedCells = useMemo(
    () => toOccupiedCells(occupiedGrids),
    [occupiedGrids],
  );
  const overlay = useMemo(
    () => buildAiRouteOverlay(points, selectedOrder),
    [points, selectedOrder],
  );
  const classification = useMemo(
    () => classifyCells(toMissionCells(overlay.gridIds), occupiedCells),
    [overlay.gridIds, occupiedCells],
  );
  const route = useMemo(
    () =>
      overlay.waypoints.length > 0
        ? { path: overlay.path, waypoints: overlay.waypoints, onWaypointTap }
        : undefined,
    [overlay, onWaypointTap],
  );

  return {
    occupiedCells,
    themeCells: classification.themeOnly,
    hatchCells: classification.both,
    route,
  };
};
