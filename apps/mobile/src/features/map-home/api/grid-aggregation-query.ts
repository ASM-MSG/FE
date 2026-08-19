import type { Bounds } from "../../../entities/cell/model/grid";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getOccupiedAggregatesInViewportOptions } from "../../../shared/api/query-options";
import type {
  GetOccupiedAggregatesInViewportResponse,
  RegionAggregateResponseDto,
} from "../../../shared/api/sdk";
import {
  AGGREGATION_SPAN_CAP_DEG,
  aggregationUnitForZoom,
  clampBoundsToSpan,
  type AggregationUnit,
} from "../model/aggregation-unit";
import { mapQueryPolicy } from "../model/map-query-policy";
import {
  mergeOverlappingMarkers,
  toRegionClusterMarkers,
  type RegionClusterMarker,
} from "../model/region-cluster-overlay";

/**
 * 저줌 점령 집계 조회 옵션 (MSG-428 L11·L12·L13) — `GET /api/grids/aggregation`.
 * 웹 `features/map-home/model/use-grid-aggregation-query.ts` 이식본이다.
 *
 * 훅(`use-grid-aggregation-query.ts`)과 이 팩토리를 나눈 이유(MSG-426 선례): 훅은
 * `auth-session`을 import하고, 그 모듈이 파싱 단계에 expo-secure-store를 끌고 와
 * vitest에서 파일을 열 수조차 없게 만든다. 게이트 판정·요청 인자 조립·직전 데이터 유지
 * 규칙을 여기(네이티브 무의존)로 내려 순수 테스트가 계약 전부를 덮게 한다.
 *
 * 지도 SDK를 import하지 않는다 — 뷰포트는 플랫폼 중립 `Bounds`로 받는다(RN 경계).
 * bbox는 확정 영역이 아니라 **뷰포트**(GridMap onCameraIdle 갱신)다 — 모바일에는 웹의
 * 확정 영역 개념 자체가 없고, 서버 명세도 뷰포트 전제다.
 */

/** 게이트 비활성 반환 전용 — 매 렌더 새 배열이면 화면의 마커 useMemo가 헛돈다(웹 관례) */
const EMPTY_ITEMS: RegionAggregateResponseDto[] = [];
const EMPTY_CLUSTERS: RegionClusterMarker[] = [];

/** 게이트 4축 입력 — 훅이 인증·테마 상태를 읽어 여기로 넘긴다 */
export interface GridAggregationGate {
  /** 지도 뷰포트 (지도 준비 전 null) */
  bounds: Bounds | null;
  zoom: number;
  isAuthenticated: boolean;
  /** 토큰 재수화 완료 여부 — 완료 전에는 로그인 여부가 미상이라 쏘지 않는다 */
  hydrated: boolean;
  /** 테마 칩 활성 여부 — 칩 화면에는 점령 층을 두지 않는다 (승인 Q4) */
  themeActive: boolean;
}

/** 생성 SDK가 요구하는 질의 형태 — `unit`은 서버 enum이지만 생성 타입은 string이다 (R9) */
interface AggregationQuery {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  unit: AggregationUnit;
}

/** 미발사 상태의 자리채움 질의 — 값 자체에 의미가 없다(enabled=false) */
const emptyQuery: AggregationQuery = {
  swLat: 0,
  swLng: 0,
  neLat: 0,
  neLng: 0,
  unit: "DONG",
};

/**
 * 게이트 판정 + 요청 인자 조립 (L11·L12).
 * 미발사 상태에서도 `query`를 0으로 채우는 이유는 생성 옵션 타입이 좌표를 요구하기
 * 때문이다 — `enabled: false`라 실제로 나가지 않는다 (viewport-query 관례).
 * 요청 bbox는 unit별 span 상한으로 클램프한다 — 상한 초과 요청(400/4402) 경로를 없앤다.
 */
export const gridAggregationQueryArgs = (
  gate: GridAggregationGate,
): {
  unit: AggregationUnit | null;
  enabled: boolean;
  query: AggregationQuery;
} => {
  const { bounds, zoom, isAuthenticated, hydrated, themeActive } = gate;
  const unit = aggregationUnitForZoom(zoom);
  const enabled =
    isAuthenticated &&
    hydrated &&
    unit !== null &&
    !themeActive &&
    bounds !== null;

  if (bounds === null || unit === null) {
    return { unit, enabled, query: emptyQuery };
  }
  const requestBounds = clampBoundsToSpan(
    bounds,
    AGGREGATION_SPAN_CAP_DEG[unit],
  );
  return {
    unit,
    enabled,
    query: {
      swLat: requestBounds.sw.lat,
      swLng: requestBounds.sw.lng,
      neLat: requestBounds.ne.lat,
      neLng: requestBounds.ne.lng,
      unit,
    },
  };
};

/**
 * 화면이 받을 items (L11) — 게이트가 닫혔거나 응답 전이면 **항상 같은** 빈 배열이다.
 * placeholderData(직전 마커 유지)는 같은 unit의 이동 중 깜빡임용이지, 칩 활성·고줌
 * 복귀·비로그인에서 마커가 남는 근거가 아니다 — 그 구간은 여기서 비운다.
 */
export const selectAggregationItems = (
  enabled: boolean,
  data: GetOccupiedAggregatesInViewportResponse | undefined,
): RegionAggregateResponseDto[] =>
  enabled && data ? unwrapEnvelope(data).items : EMPTY_ITEMS;

/** placeholderData가 읽는 직전 쿼리의 최소 형태 — 키에 실린 unit 하나뿐이다 */
type PreviousAggregationQuery =
  | { queryKey: readonly [{ query?: { unit?: string } }] }
  | undefined;

/**
 * 훅이 `useQuery`에 그대로 넘기는 옵션.
 * `mapQueryPolicy`의 keepPreviousData는 **같은 unit의 bbox 이동**에만 적용해야 한다 —
 * unit 경계를 넘으면 이전 단위 items가 현재 unit과 함께 반환돼 마커 이름·크기·병합
 * 임계·탭 목표 줌이 잠깐 어긋난다 (L13, 웹 codex 리뷰 P2). 그래서 정책을 펼친 뒤
 * placeholderData만 덮어쓴다.
 */
export const gridAggregationQueryOptions = (gate: GridAggregationGate) => {
  const { unit, enabled, query } = gridAggregationQueryArgs(gate);
  return {
    ...getOccupiedAggregatesInViewportOptions({ query }),
    enabled,
    ...mapQueryPolicy,
    placeholderData: (
      previousData: GetOccupiedAggregatesInViewportResponse | undefined,
      previousQuery: PreviousAggregationQuery,
    ): GetOccupiedAggregatesInViewportResponse | undefined =>
      previousQuery?.queryKey[0]?.query?.unit === unit
        ? previousData
        : undefined,
  };
};

/**
 * 집계 items → 지도에 게시할 마커 (파생 + 그 줌의 겹침 병합).
 * 훅이 `useMemo`로 감싸 호출한다 — 훅 파일은 vitest에서 열 수 없으므로 합성 자체를
 * 여기 순수 함수로 두어야 "unit이 null이면 마커가 없다"가 테스트로 고정된다.
 * unit이 null인 구간(개별 격자 줌)은 격자 층이 그려지는 구간이라 마커가 없어야 한다.
 */
export const toClusterMarkers = (
  items: RegionAggregateResponseDto[],
  unit: AggregationUnit | null,
  zoom: number,
): RegionClusterMarker[] =>
  unit === null
    ? EMPTY_CLUSTERS
    : mergeOverlappingMarkers(toRegionClusterMarkers(items, unit), zoom);
