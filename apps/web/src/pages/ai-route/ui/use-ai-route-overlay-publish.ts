import { useEffect, useMemo } from "react";
import { useWalkPathsQuery } from "@/features/ai-route/api/use-walk-paths-query";
import { buildAiRouteOverlay } from "@/features/ai-route/model/route-overlay";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import type { RoutePointDto } from "@/shared/api/generated";

/**
 * AI 경로 오버레이 게시 배선 (MSG-488 §4-3, use-home-overlay-publish 선례).
 * **뷰-레이어 훅** — 게시 스토어에 바로 배선하므로 RN 재사용 대상이 아니다.
 * 파생은 순수 함수(route-overlay)가 하고, 렌더는 MapCanvas 경계 안에서만 한다(R7).
 * 언마운트(섹션 이탈) 시 clear로 걷고, 재진입 시 같은 게시가 재실행돼 표시가 복원된다 (S11).
 *
 * walk-paths 실보행 좌표열도 여기서 합성한다 (MSG-490 §7 Q4) — `buildAiRouteOverlay`를 부르는
 * 곳이 이 훅 하나이고 순수 함수는 스스로 쿼리를 부를 수 없다. 응답 전에는 직선이 그려지고
 * 응답이 오면 같은 오버레이 id로 정점 목록만 바뀐다(재마운트 없는 교체, S1).
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

  const { segments } = useWalkPathsQuery(points);

  // 래퍼 객체를 매 렌더 새로 만들면 게시 useEffect까지 연쇄로 재실행돼 오버레이가
  // clear→재게시로 깜빡인다 (§8 R6 — PR #104가 잡은 자리)
  // [MSG-489 확장점] origin이 스토어에 생기면 `originOffset: 1`을 함께 넘긴다 (§8 R2)
  const walk = useMemo(() => (segments ? { segments } : undefined), [segments]);

  const overlay = useMemo(
    () => buildAiRouteOverlay(points, occupiedGridIds, selectedOrder, walk),
    [points, occupiedGridIds, selectedOrder, walk],
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
