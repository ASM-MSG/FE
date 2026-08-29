import { distanceMeters, type LatLng } from "@/entities/cell";
import type {
  RoutePointDto,
  SegmentDto,
  WalkSegmentDto,
} from "@/shared/api/generated";

/**
 * 구간(이웃 지점 쌍) 거리 파생 (MSG-488 L3 · MSG-490 L1~L8·L11).
 * 순수 함수 — 지도 SDK·플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 거리 원본은 두 층이다: walk-paths(`POST /api/routes/walk-paths`)가 준 **실보행 거리**가
 * 있으면 그것을, 없거나 미해결이면 **이웃 좌표 직선(하버사인)** 근사를 쓴다. 응답이
 * 오기 전·요청 실패는 후자로 조용히 남는다(MSG-490 §1-2 — 에러 UI 없음).
 *
 * Hermes 미구현 API 금지 구역이다 — `toSorted`·`toReversed`·`toSpliced`·`Object.groupBy`·
 * `structuredClone`을 쓰지 않는다(`[...arr].sort()` 유지, MSG-427 실기 크래시).
 */

/** 구간 거리 계산 입력 — 방문 순서와 좌표만 쓴다 */
export type RouteStopGeo = Pick<RoutePointDto, "order" | "lat" | "lng">;

/** 서버가 거절하는 세그먼트 상한 (9개 이상이면 400 + 14402) */
const MAX_WALK_SEGMENTS = 8;

/** 한국 서비스 범위 — 이 밖이면 서버가 요청 전체를 400(14402)으로 거절한다 */
const KOREA_LAT_RANGE = [33, 39] as const;
const KOREA_LNG_RANGE = [124, 132] as const;

export interface RouteLeg {
  fromOrder: number;
  toOrder: number;
  /** 구간 거리(m) — 표기 반올림 전 원값 (실보행 거리 또는 직선 근사) */
  meters: number;
  /** 커넥터 행 문구 */
  label: string;
  /** 실보행 거리로 채워졌는지 — false면 직선 근사 폴백 (표기 구분은 아직 없다, Q2) */
  resolved: boolean;
}

/** walk-paths 응답 주입 — 세그먼트는 요청과 같은 개수·같은 순서다 */
export interface WalkPathInput {
  segments: WalkSegmentDto[];
  /**
   * 카드 사이 구간보다 앞서는 세그먼트 수 — 출발지→1번 구간이 있으면 1이다.
   * [MSG-489 확장점] 출발지가 스토어에 생기면 소비 훅 2곳이 이 값을 넘긴다(§8 R2).
   */
  originOffset?: number;
}

/**
 * 도보 거리 표기 (승인 Q6·MSG-490 Q1) — 1000m 미만은 10m 반올림 m, 1000m 이상은 소수 1자리 km.
 * 반올림을 먼저 하므로 999.6m는 "1000m"가 아니라 "1.0km"로 넘어간다.
 * 실보행 거리와 직선 근사가 **같은 규칙**을 쓴다 — 같은 자리에 번갈아 뜨는 값이라
 * 표기가 갈리면 사용자가 값 변화를 폴백으로 오해한다.
 */
export const formatWalkDistance = (meters: number): string => {
  const rounded = Math.round(meters / 10) * 10;
  return rounded < 1000
    ? `도보 약 ${rounded}m`
    : `도보 약 ${(rounded / 1000).toFixed(1)}km`;
};

/**
 * walk-paths 요청 세그먼트 — 방문 순서대로 이웃 좌표쌍 하나씩 (L1·L2).
 * 좌표가 1개 이하면 빈 배열이고, 세그먼트가 상한을 넘으면 앞에서 8개만 남긴다
 * (서버 400을 부르는 입력을 FE가 만들지 않는다, Q10).
 */
export const buildWalkSegments = (stops: LatLng[]): SegmentDto[] =>
  stops.slice(1, MAX_WALK_SEGMENTS + 1).map((to, index) => ({
    startLat: stops[index].lat,
    startLng: stops[index].lng,
    endLat: to.lat,
    endLng: to.lng,
  }));

/** 한국 서비스 범위 판정 — 하나라도 벗어나면 요청 자체를 스킵한다 (L3, Q3) */
export const isWithinKoreaRange = (stops: LatLng[]): boolean =>
  stops.every(
    ({ lat, lng }) =>
      lat >= KOREA_LAT_RANGE[0] &&
      lat <= KOREA_LAT_RANGE[1] &&
      lng >= KOREA_LNG_RANGE[0] &&
      lng <= KOREA_LNG_RANGE[1],
  );

/**
 * 구간별 walk 세그먼트 정렬 — 반환 배열의 index i가 구간 i에 대응한다 (L7·L11).
 * 응답 개수가 요청 개수와 다르면 **통째로 버린다**(null) — 부분 대응은 어느 인덱스가
 * 밀렸는지 알 수 없어 엉뚱한 구간에 남의 경로를 그린다(Q9).
 */
export const alignWalkSegments = (
  legCount: number,
  walk?: WalkPathInput,
): WalkSegmentDto[] | null => {
  if (!walk) return null;
  const offset = walk.originOffset ?? 0;
  const requested = Math.min(legCount + offset, MAX_WALK_SEGMENTS);
  if (walk.segments.length !== requested) return null;
  return walk.segments.slice(offset);
};

/**
 * 방문 순서대로 이웃 쌍마다 구간 하나 — 지점이 1개 이하면 구간이 없다 (L3).
 * `walk`가 없으면 MSG-488과 같은 직선 결과다 (L4 회귀 고정).
 */
export const buildRouteLegs = (
  points: RouteStopGeo[],
  walk?: WalkPathInput,
): RouteLeg[] => {
  const ordered = [...points].sort((a, b) => a.order - b.order);
  const segments = alignWalkSegments(ordered.length - 1, walk);

  return ordered.slice(1).map((to, index) => {
    const from = ordered[index];
    const segment = segments?.[index];
    const walked =
      segment?.resolved === true && segment.distanceMeters !== null
        ? segment.distanceMeters
        : null;
    const meters =
      walked ??
      distanceMeters(
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng },
      );
    return {
      fromOrder: from.order,
      toOrder: to.order,
      meters,
      label: formatWalkDistance(meters),
      resolved: walked !== null,
    };
  });
};
