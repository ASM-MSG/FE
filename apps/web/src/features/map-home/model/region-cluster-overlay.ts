import type { LatLng } from "@/entities/cell";
import type { RegionAggregateResponseDto } from "@/shared/api/generated";
import type { AggregationUnit } from "./aggregation-unit";

/**
 * 서버 집계 `items[]` → 지역명+점령 격자 수 마커 파생 (MSG-410 AC 4·5).
 * FE 로컬 클러스터 산술(구 cluster-overlay buildClusterMarkers)을 대체한다 — 묶음은
 * 서버가 행정 단위로 만들고, 여기는 표시 파생과 겹침 병합(2차)만 한다.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 */

/** 지도에 게시할 지역 집계 마커 — MapCanvas clusters prop 계약과 동일한 순수 데이터 */
export interface RegionClusterMarker {
  /** regionCode 기반 안정 키 — null 버킷·병합 마커는 별도 규칙 (AC 4) */
  id: string;
  /** 표기 축약 적용된 지역명 — 미판정 버킷·병합 마커는 null(개수만 표시, 추정 2) */
  name: string | null;
  count: number;
  position: LatLng;
  unit: AggregationUnit;
}

/** 시도 접미 축약 대상 — 긴 접미부터 검사한다("특별자치시"가 "광역시"보다 먼저) */
const SIDO_SUFFIXES = ["특별자치시", "특별자치도", "광역시", "특별시"] as const;

/**
 * 시도명 표기 축약 (AC 4, 추정 5) — 명세가 "클라이언트 몫"으로 넘긴 규칙.
 * 접미(광역시·특별시·특별자치시·특별자치도) 제거 + 도명은 관용 축약
 * (4자 "경상남도"→"경남", 3자 "경기도"→"경기"). 디자인 예시(부산·울산·경남) 부합.
 */
const abbreviateSidoName = (name: string): string => {
  for (const suffix of SIDO_SUFFIXES) {
    if (name.endsWith(suffix) && name.length > suffix.length) {
      return name.slice(0, name.length - suffix.length);
    }
  }
  if (name.endsWith("도")) {
    if (name.length === 4) return `${name[0]}${name[2]}`;
    if (name.length === 3) return name.slice(0, 2);
  }
  return name;
};

/**
 * 집계 항목 → 마커 파생 (AC 4).
 * - 키는 regionCode 기반 — 재조회에도 같은 지역은 같은 키(렌더 안정). regionCode가
 *   null인 미판정 버킷은 같은 응답 안 등장 순번으로 별도 키를 만든다
 * - 좌표·count는 응답 값 그대로 — 서버가 격자 중심 평균으로 대표 좌표를 준다
 * - 시 단위 이름만 표기 축약한다("부산광역시 214" → "부산 214")
 */
export const toRegionClusterMarkers = (
  items: RegionAggregateResponseDto[],
  unit: AggregationUnit,
): RegionClusterMarker[] => {
  let nullBucketSeq = 0;
  return items.map((item) => ({
    id:
      item.regionCode !== null
        ? `agg-${unit}-${item.regionCode}`
        : `agg-${unit}-unassigned-${nullBucketSeq++}`,
    name:
      item.name === null
        ? null
        : unit === "SIDO"
          ? abbreviateSidoName(item.name)
          : item.name,
    count: item.count,
    position: { lat: item.lat, lng: item.lng },
    unit,
  }));
};

/**
 * 겹침 병합 임계(px) — 마커 중심 간 화면 거리가 이보다 가까우면 하나로 합친다.
 * 임계 = 해당 단위의 마커 지름(MapCanvas 크기 3단, Figma 14599:7041 1x 실측 68/80/92 —
 * 흰 링 포함 전체 지름): 중심 거리가 지름 미만이면 두 원이 실제로 겹치고, 이상이면
 * 시각적으로 분리된다. 단일 임계(최대 92 일괄)는 동 단위에서 분리된 마커까지 합쳐
 * 기각 — 한 병합 입력은 단일 unit이므로 단위별 조회로 충분하다 (재작업 1).
 */
export const MARKER_MERGE_PX: Record<AggregationUnit, number> = {
  DONG: 68,
  SIGUNGU: 80,
  SIDO: 92,
};

/** Web Mercator 세계 픽셀 좌표 (줌 z에서 한 변 256×2^z) — 화면 픽셀 거리 산출용 순수 수학 */
const projectToWorldPx = (
  { lat, lng }: LatLng,
  zoom: number,
): { x: number; y: number } => {
  const worldSize = 256 * 2 ** zoom;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * worldSize,
    y:
      (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize,
  };
};

/**
 * 같은 줌 화면에서 임계 미만으로 붙는 마커들의 2차 병합 (AC 5).
 * count 큰 마커가 앵커가 되어 근접 마커를 흡수한다 — 위치는 앵커 좌표(지배 지역 위),
 * count는 합산(총합 보존), 이름은 null(서로 다른 지역명에 한 이름을 붙일 수 없다 — 추정 2).
 * 병합 키는 멤버 키 결합 — 멤버 구성이 같으면 재조회에도 같은 키다.
 */
export const mergeOverlappingMarkers = (
  markers: RegionClusterMarker[],
  zoom: number,
): RegionClusterMarker[] => {
  interface MergeGroup {
    anchor: RegionClusterMarker;
    anchorPx: { x: number; y: number };
    memberIds: string[];
    count: number;
  }
  const groups: MergeGroup[] = [];

  const sorted = [...markers].sort(
    (a, b) => b.count - a.count || a.id.localeCompare(b.id),
  );
  for (const marker of sorted) {
    const px = projectToWorldPx(marker.position, zoom);
    const host = groups.find(
      (group) =>
        Math.hypot(px.x - group.anchorPx.x, px.y - group.anchorPx.y) <
        MARKER_MERGE_PX[marker.unit],
    );
    if (host) {
      host.memberIds.push(marker.id);
      host.count += marker.count;
    } else {
      groups.push({
        anchor: marker,
        anchorPx: px,
        memberIds: [marker.id],
        count: marker.count,
      });
    }
  }

  return groups.map(({ anchor, memberIds, count }) =>
    memberIds.length === 1
      ? anchor
      : {
          id: memberIds.sort().join("+"),
          name: null,
          count,
          position: anchor.position,
          unit: anchor.unit,
        },
  );
};
