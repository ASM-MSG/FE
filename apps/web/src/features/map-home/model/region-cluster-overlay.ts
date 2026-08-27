import type { LatLng } from "@/entities/cell";
import type {
  HotZoneRegionAggregateResponseDto,
  MissionRegionAggregateResponseDto,
  RegionAggregateResponseDto,
} from "@/shared/api/generated";
import type { AggregationUnit } from "./aggregation-unit";
import type { ThemeId } from "./theme";

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
  /** 표기 축약 적용된 지역명 — 미판정 버킷은 null(개수만 표시, 추정 2) */
  name: string | null;
  count: number;
  position: LatLng;
  unit: AggregationUnit;
  /**
   * 집계 마커의 소속 칩 (MSG-451 AC 6 → MSG-475 hot 합류) — 채움색과 접근성 문구의
   * 근거. 없으면 도감 점령 집계 마커다(기본형 렌더 — MapCanvas 계약).
   */
  theme?: ClusterMarkerTheme;
}

/** 집계 마커를 갖는 칩 — 축제·팝업·핫구역 (MSG-475 AC 5). 코스는 라인이라 대상이 아니다 */
export type ClusterMarkerTheme = Extract<ThemeId, "hot" | "festival" | "popup">;

/** 미션 집계 칩(축제·팝업) — ClusterMarkerTheme의 부분집합. 미션 훅·테스트가 그대로 쓴다 */
export type MissionMarkerTheme = Extract<ThemeId, "festival" | "popup">;

/** 파생에 필요한 집계 항목의 최소 형태 — 점령·미션 두 응답의 공통부 */
interface ClusterAggregateItem {
  regionCode: string | null;
  name: string | null;
  lat: number;
  lng: number;
  count: number;
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
const toClusterMarkers = (
  items: ClusterAggregateItem[],
  unit: AggregationUnit,
  keyPrefix: string,
  theme?: ClusterMarkerTheme,
): RegionClusterMarker[] => {
  let nullBucketSeq = 0;
  return items.map((item) => ({
    id:
      item.regionCode !== null
        ? `${keyPrefix}-${unit}-${item.regionCode}`
        : `${keyPrefix}-${unit}-unassigned-${nullBucketSeq++}`,
    name:
      item.name === null
        ? null
        : unit === "SIDO"
          ? abbreviateSidoName(item.name)
          : item.name,
    count: item.count,
    position: { lat: item.lat, lng: item.lng },
    unit,
    ...(theme ? { theme } : {}),
  }));
};

export const toRegionClusterMarkers = (
  items: RegionAggregateResponseDto[],
  unit: AggregationUnit,
): RegionClusterMarker[] => toClusterMarkers(items, unit, "agg");

/**
 * 미션 집계 항목 → 마커 파생 (MSG-451 AC 6) — `GET /api/missions/aggregation`.
 * 점령 집계와 표시 규칙(키 안정성·시도명 축약·미판정 버킷)이 같아 같은 산술을 공유하고,
 * **칩별 키 접두**로 두 층이 한 지도에 서도 렌더 키가 겹치지 않게 한다. 칩을 바꾸면 키가
 * 통째로 달라져 이전 칩의 마커가 새 칩 자리에 재사용되지 않는다.
 * 응답의 `missionIds`는 여기서 쓰지 않는다 — 묶음 선택 시 목록 좁힘(서버 D5)은 후속 몫.
 */
export const toMissionClusterMarkers = (
  items: MissionRegionAggregateResponseDto[],
  unit: AggregationUnit,
  theme: MissionMarkerTheme,
): RegionClusterMarker[] =>
  toClusterMarkers(items, unit, `mission-${theme}`, theme);

/**
 * 핫구역 집계 항목 → 마커 파생 (MSG-475 AC 10) — `GET /api/hotzones/aggregation`.
 * 표시 규칙(키 안정성·시도명 축약·미판정 버킷)은 도감·미션과 같은 산술을 공유하고,
 * 키 접두 `hot`으로 다른 층과 렌더 키가 겹치지 않게 한다. 응답의 `gridIds`는 싣지
 * 않는다 — 묶음 클릭 후 교집합 좁힘(서버 D4)은 미션 `missionIds` 선례처럼 후속 몫
 * (스펙 승인 결정 ③).
 */
export const toHotZoneClusterMarkers = (
  items: HotZoneRegionAggregateResponseDto[],
  unit: AggregationUnit,
): RegionClusterMarker[] => toClusterMarkers(items, unit, "hot", "hot");

/**
 * 겹침 병합 임계(px) — 마커 중심 간 화면 거리가 이보다 가까우면 하나로 합친다.
 * 임계 = 구 원형 마커 지름(Figma 14599:7041 1x 실측 68/80/92 — 흰 링 포함 전체 지름):
 * 중심 거리가 지름 미만이면 두 원이 실제로 겹치고, 이상이면 시각적으로 분리된다.
 * 단일 임계(최대 92 일괄)는 동 단위에서 분리된 마커까지 합쳐 기각 — 한 병합 입력은
 * 단일 unit이므로 단위별 조회로 충분하다 (재작업 1).
 *
 * MSG-475에서 웹 렌더가 말풍선(15221:20097, 크기 hug 가변)으로 바뀐 뒤에도 값은
 * 유지한다 — 병합 규칙은 "기존 그대로"(티켓 ④)가 정본이고, 모바일 parity 테스트가
 * 이 리터럴을 앵커로 대조하며 RN 렌더(cluster-marker.tsx)가 이 값을 원 지름으로
 * 소비한다. 재보정은 RN 렌더 교체 티켓과 함께 한다 (스펙 추정 6).
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
 * 이름 우선순위 비교 — 가나다순(ko), 이름 없는(null) 멤버는 최후순 (MSG-451 AC 19·20).
 * count 동률의 tiebreak이자, 이름 있는 멤버가 무귀속 버킷에 앵커를 뺏기지 않게 하는 규칙이다.
 */
const compareByName = (
  a: RegionClusterMarker,
  b: RegionClusterMarker,
): number =>
  a.name === null || b.name === null
    ? Number(a.name === null) - Number(b.name === null)
    : a.name.localeCompare(b.name, "ko");

/**
 * 같은 줌 화면에서 임계 미만으로 붙는 마커들의 2차 병합 (AC 5).
 * count 큰 마커가 앵커가 되어 근접 마커를 흡수한다 — 위치는 앵커 좌표(지배 지역 위),
 * count는 합산(총합 보존).
 *
 * **이름은 앵커의 이름을 이어받는다** (MSG-451 AC 18~20). 종전에는 null이라
 * "서로 다른 지역명에 한 이름을 붙일 수 없다"(MSG-410 추정 2)는 이유로 개수만 남았는데,
 * 실제 화면에서는 마커가 어디를 가리키는지 읽을 수 없어 개수가 쓸모를 잃었다. 앵커는
 * 이미 count 최대 멤버이므로 "가장 많았던 지역의 이름"이 그대로 나온다 — 동률은
 * 가나다순(compareByName)으로 갈라 재조회에도 같은 이름이 나오게 한다.
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

  const sorted = markers.toSorted(
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
          id: memberIds.sort().join("+"),
          name: anchor.name,
          count,
          position: anchor.position,
          unit: anchor.unit,
          // 한 병합 입력은 단일 층(점령 또는 한 칩)이므로 앵커의 테마가 곧 묶음의 테마다.
          // 빠뜨리면 합쳐진 미션 마커만 도감 색(primary)으로 렌더된다
          ...(anchor.theme ? { theme: anchor.theme } : {}),
        },
  );
};
