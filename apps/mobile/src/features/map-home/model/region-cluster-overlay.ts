import type { LatLng } from "../../../entities/cell/model/grid";
import type { RegionAggregateResponseDto } from "../../../shared/api/sdk";
import type { AggregationUnit } from "./aggregation-unit";

/**
 * 서버 집계 `items[]` → 지역명+점령 격자 수 마커 파생 — 웹
 * `features/map-home/model/region-cluster-overlay.ts`의 복제본이다 (MSG-428, 웹 MSG-410
 * 이식). 묶음은 서버가 행정 단위로 만들고, 여기는 표시 파생과 겹침 병합(2차)만 한다.
 * 동등성은 region-cluster-overlay.parity.test.ts가 웹 원본을 직접 import해 단정한다.
 * 순수 모듈 — 지도 SDK/RN에 의존하지 않는다(GridMap이 이 데이터를 마커로 그린다).
 */

/** 지도에 게시할 지역 집계 마커 — GridMap `clusters` prop 계약과 동일한 순수 데이터 */
export interface RegionClusterMarker {
  /** regionCode 기반 안정 키 — null 버킷·병합 마커는 별도 규칙 */
  id: string;
  /** 표기 축약 적용된 지역명 — 미판정 버킷·병합 마커는 null(개수만 표시) */
  name: string | null;
  count: number;
  position: LatLng;
  unit: AggregationUnit;
}

/** 시도 접미 축약 대상 — 긴 접미부터 검사한다("특별자치시"가 "광역시"보다 먼저) */
const SIDO_SUFFIXES = ["특별자치시", "특별자치도", "광역시", "특별시"] as const;

/**
 * 시도명 표기 축약 — 명세가 "클라이언트 몫"으로 넘긴 규칙.
 * 접미(광역시·특별시·특별자치시·특별자치도) 제거 + 도명은 관용 축약
 * (4자 "경상남도"→"경남", 3자 "경기도"→"경기").
 * MVP는 줌 하한(MAP_MIN_ZOOM)이 SIDO 구간 진입을 막아 실사용 경로가 없지만, 웹과의
 * 전건 동등성을 위해 남긴다(전국 확장 시 하한만 되돌리면 그대로 산다).
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
 * 집계 항목 → 마커 파생.
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
 * 임계 = 해당 단위의 **마커 지름**(Figma 14599:7041 1x 실측 68/80/92 — 흰 링 포함 전체
 * 지름): 중심 거리가 지름 미만이면 두 원이 실제로 겹치고, 이상이면 시각적으로 분리된다.
 * MSG-558부터 마커 렌더는 말풍선(크기 단일, cluster-bubble-size)이라 이 표를 더는 읽지
 * 않는다 — 값은 웹 parity 리터럴이라 불변이고, 재보정은 웹과 함께 별도 티켓.
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
 * 같은 줌 화면에서 임계 미만으로 붙는 마커들의 2차 병합.
 * count 큰 마커가 앵커가 되어 근접 마커를 흡수한다 — 위치는 앵커 좌표(지배 지역 위),
 * count는 합산(총합 보존).
 *
 * **이름은 앵커의 이름을 이어받는다** (MSG-451, 웹 원본과 동시 개정). 종전에는 null이라
 * "서로 다른 지역명에 한 이름을 붙일 수 없다"는 이유로 개수만 남았는데, 실제 화면에서는
 * 마커가 어디를 가리키는지 읽을 수 없어 개수가 쓸모를 잃었다. 앵커는 이미 count 최대
 * 멤버이므로 "가장 많았던 지역의 이름"이 그대로 나온다 — 동률은 가나다순으로 갈라
 * 재조회에도 같은 이름이 나오게 한다.
 * 병합 키는 멤버 키 결합 — 멤버 구성이 같으면 재조회에도 같은 키다.
 *
 * 웹은 `markers.toSorted(...)`를 쓰지만 Hermes(RN 0.86)에 미구현이라 스프레드 복사+sort로
 * 옮겼다 — 입력 배열을 변형하지 않는 성질은 같다 (dex/gallery-groups.ts 선례).
 */
const compareByName = (
  a: RegionClusterMarker,
  b: RegionClusterMarker,
): number =>
  a.name === null || b.name === null
    ? Number(a.name === null) - Number(b.name === null)
    : a.name.localeCompare(b.name, "ko");

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
    (a, b) =>
      b.count - a.count || compareByName(a, b) || a.id.localeCompare(b.id),
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
          id: [...memberIds].sort().join("+"),
          name: anchor.name,
          count,
          position: anchor.position,
          unit: anchor.unit,
        },
  );
};
