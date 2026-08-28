import { useEffect, useMemo } from "react";
import { buildAiRouteOverlay } from "@/features/ai-route/model/route-overlay";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import type { RoutePointDto } from "@/shared/api/generated";

/**
 * AI 경로 오버레이 게시 배선 (MSG-488 §4-3, use-home-overlay-publish 선례).
 * **뷰-레이어 훅** — 게시 스토어에 바로 배선하므로 RN 재사용 대상이 아니다.
 * 파생은 순수 함수(route-overlay)가 하고, 렌더는 MapCanvas 경계 안에서만 한다(R7).
 * 언마운트(섹션 이탈) 시 clear로 걷고, 재진입 시 같은 게시가 재실행돼 표시가 복원된다 (S11).
 */
interface AiRouteOverlayPublishInput {
  points: RoutePointDto[];
  /** 내 점령 격자 id — 교집합이면 빗금 (홈 테마 셀 규칙과 동일) */
  occupiedGridIds: string[];
  selectedOrder: number | null;
  /** 마커 클릭 → 카드 선택·스크롤 (S8) */
  onWaypointSelect: (order: number) => void;
}

export const useAiRouteOverlayPublish = ({
  points,
  occupiedGridIds,
  selectedOrder,
  onWaypointSelect,
}: AiRouteOverlayPublishInput): void => {
  const setCells = useMapOverlayStore((s) => s.setCells);
  const setRoutes = useMapOverlayStore((s) => s.setRoutes);
  const setOnRouteWaypointClick = useMapOverlayStore(
    (s) => s.setOnRouteWaypointClick,
  );
  const clearOverlays = useMapOverlayStore((s) => s.clear);

  const overlay = useMemo(
    () => buildAiRouteOverlay(points, occupiedGridIds, selectedOrder),
    [points, occupiedGridIds, selectedOrder],
  );

  useEffect(() => {
    setCells(overlay.cells);
    setRoutes(overlay.routes);
    setOnRouteWaypointClick((_routeId, seq) => onWaypointSelect(seq));
    return () => clearOverlays();
  }, [
    overlay,
    onWaypointSelect,
    setCells,
    setRoutes,
    setOnRouteWaypointClick,
    clearOverlays,
  ]);
};
