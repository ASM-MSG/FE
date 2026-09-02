import type { Bounds } from "../../../entities/cell/model/grid";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import {
  getHotZoneAggregatesOptions,
  getMissionAggregatesOptions,
} from "../../../shared/api/query-options";
import type {
  GetHotZoneAggregatesResponse,
  GetMissionAggregatesResponse,
} from "../../../shared/api/sdk";
import {
  AGGREGATION_SPAN_CAP_DEG,
  aggregationUnitForZoom,
  clampBoundsToSpan,
  type AggregationUnit,
} from "../model/aggregation-unit";
import { mapQueryPolicy } from "../model/map-query-policy";
import { missionTypeParam } from "../model/mission";
import {
  mergeOverlappingMarkers,
  toHotZoneClusterMarkers,
  toMissionClusterMarkers,
  type MissionMarkerTheme,
  type RegionClusterMarker,
} from "../model/region-cluster-overlay";
import type { ThemeId } from "../model/themes";

/**
 * 칩 택일 저줌 집계 (MSG-558 확장 L6~L9) — 미션 `GET /api/missions/aggregation`(축제·팝업)과
 * 핫구역 `GET /api/hotzones/aggregation`. 웹 `use-mission-aggregation-query.ts`·
 * `use-hotzone-aggregation-query.ts` + `MapShell.tsx` 택일 분기의 이식본이다.
 *
 * `grid-aggregation-query.ts`와 같은 "옵션 팩토리 + 얇은 훅" 구조 — 게이트·요청 인자·
 * 직전 데이터 유지·마커 합성을 여기(순수)로 내려 테스트가 계약 전부를 덮는다. 훅 파일은
 * `auth-session`이 expo-secure-store를 끌고 와 vitest에서 열리지 않는다(MSG-426 선례).
 *
 * 점령 집계와 **같은 축척 표·같은 상한·같은 bbox 정본(뷰포트)**을 쓴다 — 두 층이 같은
 * 줌에서 같은 행정 단위로 갈리지 않으면 칩을 켜고 끌 때 묶음 단위가 튄다.
 * **인증 게이트 없음** — 웹 MSG-454 익명 허용(C1). 점령 집계만 로그인 게이트.
 */

/** 집계 소스 — 웹 MapShell 택일 분기(`activeTheme` 기준)의 순수 표현 */
export type ClusterSource = "occupied" | "hot" | "mission" | "none";

/** 칩 → 집계 소스. 경로추천 칩은 집계 층이 없다(웹 `activeTheme !== null → []`) */
export const clusterSourceForTheme = (theme: ThemeId | null): ClusterSource => {
  switch (theme) {
    case null:
      return "occupied";
    case "hot":
      return "hot";
    case "festival":
    case "popup":
      return "mission";
    case "route":
      return "none";
  }
};

const missionThemeOf = (theme: ThemeId | null): MissionMarkerTheme | null =>
  theme === "festival" || theme === "popup" ? theme : null;

/** 게이트 3축 입력 — 훅이 테마·뷰포트를 읽어 넘긴다. 인증 축은 없다(C1) */
export interface ThemeAggregationGate {
  theme: ThemeId | null;
  /** 지도 뷰포트 (지도 준비 전 null) */
  bounds: Bounds | null;
  zoom: number;
}

interface RequestBbox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

/** 미발사 상태의 자리채움 bbox — 생성 옵션 타입이 좌표를 요구해 0으로 채운다(enabled=false) */
const EMPTY_BBOX: RequestBbox = { swLat: 0, swLng: 0, neLat: 0, neLng: 0 };

/** 요청 bbox는 unit별 span 상한으로 클램프한다 — 상한 초과 요청(400) 경로를 없앤다 */
const requestBbox = (
  bounds: Bounds | null,
  unit: AggregationUnit | null,
): RequestBbox | null => {
  if (bounds === null || unit === null) return null;
  const { sw, ne } = clampBoundsToSpan(bounds, AGGREGATION_SPAN_CAP_DEG[unit]);
  return { swLat: sw.lat, swLng: sw.lng, neLat: ne.lat, neLng: ne.lng };
};

/** 미션 집계 게이트 판정 + 요청 인자 (L7): 축제·팝업 칩 && unit 판정 && 뷰포트 존재 */
export const missionAggregationQueryArgs = ({
  theme,
  bounds,
  zoom,
}: ThemeAggregationGate): {
  unit: AggregationUnit | null;
  enabled: boolean;
  query: RequestBbox & { type: string; unit: AggregationUnit };
} => {
  const unit = aggregationUnitForZoom(zoom);
  const missionTheme = missionThemeOf(theme);
  const bbox = requestBbox(bounds, unit);
  if (missionTheme === null || unit === null || bbox === null) {
    return {
      unit,
      enabled: false,
      query: { type: "EVENT", unit: "DONG", ...EMPTY_BBOX },
    };
  }
  return {
    unit,
    enabled: true,
    query: { type: missionTypeParam(missionTheme), unit, ...bbox },
  };
};

/** 핫구역 집계 게이트 판정 + 요청 인자 (L7): 핫 칩 && unit 판정 && 뷰포트 존재. `type` 없음 */
export const hotZoneAggregationQueryArgs = ({
  theme,
  bounds,
  zoom,
}: ThemeAggregationGate): {
  unit: AggregationUnit | null;
  enabled: boolean;
  query: RequestBbox & { unit: AggregationUnit };
} => {
  const unit = aggregationUnitForZoom(zoom);
  const bbox = requestBbox(bounds, unit);
  if (theme !== "hot" || unit === null || bbox === null) {
    return { unit, enabled: false, query: { unit: "DONG", ...EMPTY_BBOX } };
  }
  return { unit, enabled: true, query: { unit, ...bbox } };
};

/** placeholderData가 읽는 직전 쿼리의 최소 형태 — 키에 실린 unit·type뿐이다 */
type PreviousThemeQuery =
  | { queryKey: readonly [{ query?: { unit?: string; type?: string } }] }
  | undefined;

/**
 * 훅이 `useQuery`에 그대로 넘기는 미션 옵션 (L8). `mapQueryPolicy`의 keepPreviousData는
 * **같은 unit && 같은 type**의 bbox 이동에만 적용한다 — unit·칩 경계를 넘으면 이전
 * 단위·이전 칩 항목이 현재와 함께 반환돼 병합 임계·탭 목표 줌·채움색이 어긋난다.
 */
export const missionAggregationQueryOptions = (gate: ThemeAggregationGate) => {
  const { unit, enabled, query } = missionAggregationQueryArgs(gate);
  return {
    ...getMissionAggregatesOptions({ query }),
    enabled,
    ...mapQueryPolicy,
    placeholderData: (
      previousData: GetMissionAggregatesResponse | undefined,
      previousQuery: PreviousThemeQuery,
    ): GetMissionAggregatesResponse | undefined => {
      const previous = previousQuery?.queryKey[0]?.query;
      return previous?.unit === unit && previous?.type === query.type
        ? previousData
        : undefined;
    },
  };
};

/** 핫구역 옵션 (L8) — 같은 unit의 bbox 이동에서만 직전 데이터를 유지한다 */
export const hotZoneAggregationQueryOptions = (gate: ThemeAggregationGate) => {
  const { unit, enabled, query } = hotZoneAggregationQueryArgs(gate);
  return {
    ...getHotZoneAggregatesOptions({ query }),
    enabled,
    ...mapQueryPolicy,
    placeholderData: (
      previousData: GetHotZoneAggregatesResponse | undefined,
      previousQuery: PreviousThemeQuery,
    ): GetHotZoneAggregatesResponse | undefined =>
      previousQuery?.queryKey[0]?.query?.unit === unit
        ? previousData
        : undefined,
  };
};

/** 게이트 비활성 반환 전용 — 매 렌더 새 배열이면 화면의 마커 useMemo가 헛돈다 */
const EMPTY_CLUSTERS: RegionClusterMarker[] = [];

/**
 * 칩 응답 → 지도에 게시할 마커 (L9) — 소스별 파생 + 그 줌의 겹침 병합(C7, 임계 동일).
 * 응답 `data`는 **배열 직접**이라 `unwrapEnvelope`가 곧 items다(점령의 `{ items }`와 다름, C8).
 * 소스가 `occupied`·`none`이거나 unit null·응답 미도착이면 항상 같은 빈 배열 참조.
 */
export const selectThemeClusters = ({
  theme,
  unit,
  zoom,
  missionData,
  hotData,
}: {
  theme: ThemeId | null;
  unit: AggregationUnit | null;
  zoom: number;
  missionData: GetMissionAggregatesResponse | undefined;
  hotData: GetHotZoneAggregatesResponse | undefined;
}): RegionClusterMarker[] => {
  if (unit === null) return EMPTY_CLUSTERS;
  const missionTheme = missionThemeOf(theme);
  if (missionTheme !== null && missionData) {
    return mergeOverlappingMarkers(
      toMissionClusterMarkers(unwrapEnvelope(missionData), unit, missionTheme),
      zoom,
    );
  }
  if (theme === "hot" && hotData) {
    return mergeOverlappingMarkers(
      toHotZoneClusterMarkers(unwrapEnvelope(hotData), unit),
      zoom,
    );
  }
  return EMPTY_CLUSTERS;
};
