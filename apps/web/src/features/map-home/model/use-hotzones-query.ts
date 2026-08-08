import { useQuery } from "@tanstack/react-query";
import { decodeGridBounds, type Bounds } from "@/entities/cell";
import { getHotZonesOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { mapQueryPolicy } from "./map-query-policy";
import type { ThemeCell } from "./theme";
import { viewportQueryArgs } from "./viewport-query";

/**
 * 뷰포트 내 핫구역 조회 (MSG-325 기준 14) — 핫스코어 내림차순, 없으면 빈 목록.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 반환은 테마 셀 형태다 — 핫구역만 API 소스로 전환하고 지역축제·팝업스토어·경로추천은
 * 목을 유지하므로(결정 3), 두 소스가 같은 오버레이 파이프라인(buildHomeOverlayCells)을 탄다.
 */
export const useHotZoneCells = (bounds: Bounds | null): ThemeCell[] => {
  const { query: viewport, enabled } = viewportQueryArgs(bounds);
  const { data } = useQuery({
    ...getHotZonesOptions({ query: viewport }),
    select: unwrapEnvelope,
    enabled,
    ...mapQueryPolicy,
  });

  return (data?.hotZones ?? []).map(({ gridId }) => {
    const cellBounds = decodeGridBounds(gridId);
    return {
      id: gridId,
      center: {
        lat: (cellBounds.sw.lat + cellBounds.ne.lat) / 2,
        lng: (cellBounds.sw.lng + cellBounds.ne.lng) / 2,
      },
    };
  });
};
