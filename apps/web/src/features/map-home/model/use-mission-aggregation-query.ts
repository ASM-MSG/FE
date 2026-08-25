import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Bounds } from "@/entities/cell";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getMissionAggregatesOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import {
  AGGREGATION_SPAN_CAP_DEG,
  aggregationUnitForZoom,
  clampBoundsToSpan,
} from "./aggregation-unit";
import { mapQueryPolicy } from "./map-query-policy";
import { missionTypeParam } from "./mission";
import {
  toMissionClusterMarkers,
  type MissionMarkerTheme,
  type RegionClusterMarker,
} from "./region-cluster-overlay";

/**
 * 저줌 미션 집계 조회 (MSG-451 AC 1·4·5) — `GET /api/missions/aggregation` (서버 MSG-437).
 * 지도 SDK를 import하지 않는다 — 뷰포트는 플랫폼 중립 `Bounds`로 받는다(RN 경계).
 *
 * 도감 집계(`use-grid-aggregation-query`)와 **같은 축척 표·같은 상한·같은 bbox 정본**을
 * 쓴다: 두 층이 같은 줌에서 같은 행정 단위로 갈리지 않으면 칩을 켜고 끌 때마다 마커
 * 크기와 묶음 단위가 튄다. bbox가 확정 영역이 아니라 뷰포트인 이유도 같다(스펙 추정 8) —
 * 저줌에서는 "장소 불러오기"가 노출되지 않아 확정 영역으로 묶으면 갱신 수단이 없다.
 *
 * 게이트: 축제·팝업 칩 && unit 판정됨(zoom < GRID_MIN_ZOOM) && 뷰포트 존재.
 * 인증 게이트 없음 — MSG-454로 익명 조회 허용 (MSG-463에서 해제).
 */
const EMPTY_MARKERS: RegionClusterMarker[] = [];

export const useMissionAggregationQuery = (
  theme: MissionMarkerTheme | null,
  bounds: Bounds | null,
  zoom: number,
): { markers: RegionClusterMarker[] } => {
  const unit = aggregationUnitForZoom(zoom);
  const enabled = theme !== null && unit !== null && bounds !== null;

  // 미요청 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (viewportQueryArgs 관례)
  const requestBounds =
    bounds && unit
      ? clampBoundsToSpan(bounds, AGGREGATION_SPAN_CAP_DEG[unit])
      : null;
  const query =
    requestBounds && unit && theme
      ? {
          type: missionTypeParam(theme),
          unit,
          swLat: requestBounds.sw.lat,
          swLng: requestBounds.sw.lng,
          neLat: requestBounds.ne.lat,
          neLng: requestBounds.ne.lng,
        }
      : {
          type: "EVENT",
          unit: "DONG",
          swLat: 0,
          swLng: 0,
          neLat: 0,
          neLng: 0,
        };

  const { data } = useQuery({
    ...getMissionAggregatesOptions({ query }),
    enabled,
    ...mapQueryPolicy,
    // 같은 unit의 bbox 이동에서만 직전 마커를 유지한다 — unit·칩 경계를 넘으면 이전
    // 단위 항목이 현재 unit과 함께 반환돼 마커 크기·병합 임계·클릭 줌이 어긋난다
    // (도감 집계 codex 리뷰 P2와 같은 함정)
    placeholderData: (previousData, previousQuery) => {
      const previous = previousQuery?.queryKey[0]?.query;
      return previous?.unit === unit && previous?.type === query.type
        ? previousData
        : undefined;
    },
  });

  return useMemo(() => {
    if (!enabled || !data || unit === null || theme === null)
      return { markers: EMPTY_MARKERS };
    return {
      markers: toMissionClusterMarkers(unwrapEnvelope(data), unit, theme),
    };
  }, [enabled, data, unit, theme]);
};
