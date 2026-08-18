import { useQuery } from "@tanstack/react-query";
import type { Bounds } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { unwrapEnvelope } from "@/shared/api/envelope";
import type { RegionAggregateResponseDto } from "@/shared/api/generated";
import { getOccupiedAggregatesInViewportOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import {
  AGGREGATION_SPAN_CAP_DEG,
  aggregationUnitForZoom,
  clampBoundsToSpan,
  type AggregationUnit,
} from "./aggregation-unit";
import { mapQueryPolicy } from "./map-query-policy";
import { useThemeFilterStore } from "./theme-filter-store";

/** 게이트 비활성 반환 전용 — 매 렌더 새 배열이면 셸 clusters useMemo가 헛돈다(use-hotzones-query 관례) */
const EMPTY_ITEMS: RegionAggregateResponseDto[] = [];

/**
 * 저줌 점령 집계 조회 (MSG-410 AC 2·3·9) — `GET /api/grids/aggregation`.
 * 지도 SDK를 import하지 않는다 — 뷰포트는 플랫폼 중립 `Bounds`로 받는다(RN 경계).
 *
 * bbox는 **뷰포트**(idle 갱신)다 — MSG-403 확정 영역(committedBounds) 정본의 명시적
 * 예외(스펙 추정 1, 사용자 승인): "장소 불러오기"가 4km~ 줌에서는 노출되지 않아 확정
 * 영역으로 묶으면 시 단위 줌에서 갱신 수단이 없고, 서버 명세도 뷰포트 전제다.
 * 개별 격자·핫구역·미션·격자 리스트는 종전대로 확정 영역 유지.
 *
 * 게이트(AC 2): 로그인(보호 API — 익명 401 재발사 방지 관례) && zoom < GRID_MIN_ZOOM
 * (= unit 판정됨) && 활성 칩 없음(MSG-403 AC 1·2 — 칩 화면에 점령 층 없음) && bounds 존재.
 * items도 같은 게이트로 비운다 — placeholderData(직전 마커 유지, 추정 6)는 **같은
 * unit의** 이동 중 깜빡임용이지 칩 활성·고줌 복귀·unit 전환에서 마커가 남는 근거가
 * 아니다.
 */
export const useGridAggregationQuery = (
  bounds: Bounds | null,
  zoom: number,
): {
  items: RegionAggregateResponseDto[];
  unit: AggregationUnit | null;
} => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeTheme = useThemeFilterStore((s) => s.activeTheme);
  const unit = aggregationUnitForZoom(zoom);
  const enabled =
    isAuthenticated && unit !== null && activeTheme === null && bounds !== null;

  // 미요청 상태의 query 값은 enabled가 false라 실제로 나가지 않지만, 생성 옵션 타입이
  // 요구해 0으로 채운다 (viewportQueryArgs 관례). 요청 bbox는 unit 상한으로 클램프 (AC 3)
  const requestBounds =
    bounds && unit
      ? clampBoundsToSpan(bounds, AGGREGATION_SPAN_CAP_DEG[unit])
      : null;
  const query =
    requestBounds && unit
      ? {
          swLat: requestBounds.sw.lat,
          swLng: requestBounds.sw.lng,
          neLat: requestBounds.ne.lat,
          neLng: requestBounds.ne.lng,
          unit,
        }
      : { swLat: 0, swLng: 0, neLat: 0, neLng: 0, unit: "DONG" };

  const { data } = useQuery({
    ...getOccupiedAggregatesInViewportOptions({ query }),
    enabled,
    ...mapQueryPolicy,
    // keepPreviousData(추정 6)는 **같은 unit의 bbox 이동**에만 — unit 경계를 넘으면
    // 이전 단위 items가 현재 unit과 함께 반환돼 마커 이름·크기·병합 임계·클릭 줌이
    // 잠깐 어긋난다(codex 리뷰 P2). 이전 쿼리 키의 unit이 다르면 새 응답까지 비운다.
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[0]?.query?.unit === unit
        ? previousData
        : undefined,
  });

  return {
    items: enabled && data ? unwrapEnvelope(data).items : EMPTY_ITEMS,
    unit,
  };
};
