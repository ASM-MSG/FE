import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Bounds } from "@/entities/cell";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getHotZoneAggregatesOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import {
  AGGREGATION_SPAN_CAP_DEG,
  aggregationUnitForZoom,
  clampBoundsToSpan,
} from "./aggregation-unit";
import { mapQueryPolicy } from "./map-query-policy";
import {
  toHotZoneClusterMarkers,
  type RegionClusterMarker,
} from "./region-cluster-overlay";

/**
 * 저줌 핫구역 집계 조회 (MSG-475 AC 6~9) — `GET /api/hotzones/aggregation` (서버 MSG-466).
 * 지도 SDK를 import하지 않는다 — 뷰포트는 플랫폼 중립 `Bounds`로 받는다(RN 경계).
 *
 * 도감·미션 집계와 **같은 축척 표·같은 상한·같은 bbox 정본(뷰포트)**을 쓴다 — 저줌에는
 * "장소 불러오기"가 없어 확정 영역으로는 갱신 수단이 없다(확정 영역 정본의 명시적 예외,
 * 스펙 추정 7). 핫구역 **개별** 조회(`use-hotzones-query`)는 종전대로 확정 영역이다.
 *
 * 게이트: 핫 칩 && unit 판정됨(zoom < GRID_MIN_ZOOM) && 뷰포트 존재.
 * 인증 게이트 없음 — 사용자별 값이 없어 익명 조회 허용 (명세·티켓 명시, AC 8).
 */
const EMPTY_MARKERS: RegionClusterMarker[] = [];

export const useHotZoneAggregationQuery = (
  active: boolean,
  bounds: Bounds | null,
  zoom: number,
): { markers: RegionClusterMarker[] } => {
  const unit = aggregationUnitForZoom(zoom);
  const enabled = active && unit !== null && bounds !== null;

  // 미요청 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (viewportQueryArgs 관례)
  const requestBounds =
    bounds && unit
      ? clampBoundsToSpan(bounds, AGGREGATION_SPAN_CAP_DEG[unit])
      : null;
  const query =
    requestBounds && unit
      ? {
          unit,
          swLat: requestBounds.sw.lat,
          swLng: requestBounds.sw.lng,
          neLat: requestBounds.ne.lat,
          neLng: requestBounds.ne.lng,
        }
      : { unit: "DONG", swLat: 0, swLng: 0, neLat: 0, neLng: 0 };

  const { data } = useQuery({
    ...getHotZoneAggregatesOptions({ query }),
    enabled,
    ...mapQueryPolicy,
    // 같은 unit의 bbox 이동에서만 직전 마커를 유지한다 — unit 경계를 넘으면 이전
    // 단위 항목이 현재 unit과 함께 반환돼 마커 병합 임계·클릭 줌이 어긋난다
    // (도감·미션 집계와 같은 함정, AC 9)
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[0]?.query?.unit === unit
        ? previousData
        : undefined,
  });

  return useMemo(() => {
    if (!enabled || !data || unit === null) return { markers: EMPTY_MARKERS };
    return { markers: toHotZoneClusterMarkers(unwrapEnvelope(data), unit) };
  }, [enabled, data, unit]);
};
