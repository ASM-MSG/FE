import {
  cellCenterAt,
  encodeGridId,
  viewportGridRange,
  type Bounds,
  type LatLng,
} from "@/entities/cell";
import { pointInPolygon } from "@/entities/region";
import type { MissionResponseDto } from "@/shared/api/generated";
import type { ThemeId } from "./theme";

/**
 * 활성 미션(`GET /api/missions/active`) 분류·기하 파생 (MSG-395 AC 1·2).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 서버는 축제·팝업·코스를 한 응답에 담고 `type`으로 가르며, 유형별 렌더 shape가
 * `MissionShape`(= unknown) 유니온이라 **런타임 판별이 필요하다**. 판별을 `type`이 아니라
 * shape의 필드 유무로 하는 이유: 명세 주석이 CELLS/BOX/PATH/REGION을 THEME·CONTINUOUS /
 * EVENT / COURSE / AREA에만 대응시키고 **POPUP의 shape를 규정하지 않았다** — type 표에
 * 기대면 팝업이 통째로 빈 격자가 된다.
 *
 * **격자를 미리 펼치지 않는다** (사용자 렉 보고 후 개정): 실 응답은 BOX 미션이 170개이고
 * 하나가 900m 사방(9×9=81칸)이라, 전 미션의 격자를 나열하면 좌표 변환(proj4)이 수만 번
 * 돌고 지도에 폴리곤 1만 개가 올라가 줌·이동이 멈춘다. 대신
 * - 진행도는 **내 수집 격자(≤30개)를 미션 도형에 넣어보는** 방향으로 뒤집고,
 * - 지도 타일은 **뷰포트에 걸치는 미션만, 뷰포트 범위 안에서만** 펼친다.
 */

/** 미션이 실리는 칩 — 상단 칩 4종 중 핫구역을 뺀 3종 */
export type MissionChip = Extract<ThemeId, "festival" | "popup" | "route">;

/**
 * 미션 type → 칩 버킷. [AC 1]
 * AREA·CONTINUOUS는 이번 티켓의 칩 3종에 대응이 없어 어느 버킷에도 넣지 않는다
 * (AREA는 경계를 region API로 따로 받아야 해 격자 파생 자체가 불가 — 리스크 기록).
 */
export const missionChipOf = (
  type: MissionResponseDto["type"],
): MissionChip | null => {
  switch (type) {
    case "EVENT":
    case "THEME":
      return "festival";
    case "POPUP":
      return "popup";
    case "COURSE":
      return "route";
    default:
      return null;
  }
};

/** 칩별 미션 목록 */
export type MissionBuckets = Record<MissionChip, MissionResponseDto[]>;

/** 활성 미션 응답 → 칩별 목록. 대응 없는 type은 버린다. [AC 1] */
export const toMissionBuckets = (
  missions: MissionResponseDto[],
): MissionBuckets => {
  const buckets: MissionBuckets = { festival: [], popup: [], route: [] };
  for (const mission of missions) {
    const chip = missionChipOf(mission.type);
    if (chip !== null) buckets[chip].push(mission);
  }
  return buckets;
};

/** 코스 포토스팟 — `PathShape.spots` 대응 (명세상 seq는 NULL 허용) */
export interface CourseSpotDto {
  gridId: string;
  lat: number;
  lng: number;
  seq: number | null;
}

/** 격자 id + 좌표를 함께 갖는 지점 — CELLS·PATH shape의 공통 부분 */
interface GridPoint {
  gridId: string;
  lat: number;
  lng: number;
}

/**
 * 런타임 판별을 마친 미션 도형. [AC 2]
 * 소비처(진행도·오버레이·코스 상세)가 shape 종별 분기를 각자 반복하지 않도록 한 번만 편다.
 */
export interface MissionShape {
  kind: "cells" | "path" | "box" | "none";
  /** CELLS·PATH의 지점 목록 — BOX·REGION은 빈 배열 */
  points: GridPoint[];
  /** CELLS·PATH의 격자 id 집합 — 포함 판정용 (매 판정마다 Set을 새로 만들지 않는다) */
  gridIds: ReadonlySet<string>;
  /** PATH 전용 — 순번 포함 원본 */
  spots: CourseSpotDto[];
  /** PATH 전용 — 코스 라인 GeoJSON 원문 */
  line: string | null;
  /** BOX 전용 — 경계 폴리곤 */
  polygon: LatLng[];
  /** 도형 경계 상자 — 뷰포트 교차 판정용. 좌표가 없으면 null */
  bbox: Bounds | null;
}

const EMPTY_SHAPE: MissionShape = {
  kind: "none",
  points: [],
  gridIds: new Set(),
  spots: [],
  line: null,
  polygon: [],
  bbox: null,
};

/** 좌표 목록 → 경계 상자. 비면 null */
const boundsOf = (points: LatLng[]): Bounds | null => {
  if (points.length === 0) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    sw: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    ne: { lat: Math.max(...lats), lng: Math.max(...lngs) },
  };
};

const fromGridPoints = (
  kind: "cells" | "path",
  points: GridPoint[],
  extra: Partial<MissionShape> = {},
): MissionShape => ({
  ...EMPTY_SHAPE,
  kind,
  points,
  gridIds: new Set(points.map((p) => p.gridId)),
  bbox: boundsOf(points),
  ...extra,
});

/** 응답 shape → 판별된 도형. [AC 2] */
export const missionShapeOf = (mission: MissionResponseDto): MissionShape => {
  const shape: unknown = mission.shape;
  if (!isRecord(shape)) return EMPTY_SHAPE;

  if (Array.isArray(shape.spots)) {
    const spots = shape.spots as CourseSpotDto[];
    return fromGridPoints("path", spots, {
      spots,
      line: typeof shape.line === "string" ? shape.line : null,
    });
  }

  if (Array.isArray(shape.cells))
    return fromGridPoints("cells", shape.cells as GridPoint[]);

  if (Array.isArray(shape.polygon)) {
    const polygon = shape.polygon as LatLng[];
    return { ...EMPTY_SHAPE, kind: "box", polygon, bbox: boundsOf(polygon) };
  }

  return EMPTY_SHAPE;
};

/**
 * 이 격자가 미션 영역 안인가. [AC 3]
 * 진행도는 **미션 격자를 펼쳐 교집합**하는 대신 이 판정을 내 수집 격자마다 부른다 —
 * 미션 하나의 격자가 최대 81칸인데 수집 격자는 30개뿐이라 방향을 뒤집는 쪽이 훨씬 싸고,
 * BOX 미션에서는 좌표 변환을 아예 하지 않게 된다.
 */
export const missionCoversGrid = (
  shape: MissionShape,
  gridId: string,
  center: LatLng,
): boolean =>
  shape.kind === "box"
    ? // pointInPolygon은 MultiPolygon(폴리곤[] → 링[])을 받는다 — 외곽 링 하나짜리로 감싼다
      pointInPolygon(center, [[shape.polygon]])
    : shape.gridIds.has(gridId);

/** 두 경계 상자가 겹치는가 — 지도에 그릴 미션을 고르는 1차 필터 */
export const boundsIntersect = (a: Bounds, b: Bounds): boolean =>
  a.sw.lat <= b.ne.lat &&
  a.ne.lat >= b.sw.lat &&
  a.sw.lng <= b.ne.lng &&
  a.ne.lng >= b.sw.lng;

/**
 * 뷰포트 안에 들어오는 미션 격자 id. [AC 2·15]
 * 화면 밖 격자는 어차피 안 보이므로 펼치지 않는다 — 전국 미션을 모두 펼치던 것이
 * 줌·이동 때마다 지도를 멈추게 한 원인이다.
 */
export const missionGridIdsInBounds = (
  shape: MissionShape,
  bounds: Bounds,
): string[] => {
  if (shape.bbox === null || !boundsIntersect(shape.bbox, bounds)) return [];

  if (shape.kind !== "box")
    return shape.points
      .filter(
        (p) =>
          p.lat >= bounds.sw.lat &&
          p.lat <= bounds.ne.lat &&
          p.lng >= bounds.sw.lng &&
          p.lng <= bounds.ne.lng,
      )
      .map((p) => p.gridId);

  // BOX: 폴리곤 bbox와 뷰포트의 교집합만 격자로 훑고, 중심이 폴리곤 내부인 칸만 담는다
  const clip: Bounds = {
    sw: {
      lat: Math.max(shape.bbox.sw.lat, bounds.sw.lat),
      lng: Math.max(shape.bbox.sw.lng, bounds.sw.lng),
    },
    ne: {
      lat: Math.min(shape.bbox.ne.lat, bounds.ne.lat),
      lng: Math.min(shape.bbox.ne.lng, bounds.ne.lng),
    },
  };
  const range = viewportGridRange(clip);

  const ids: string[] = [];
  for (let gridY = range.minGridY; gridY <= range.maxGridY; gridY += 1) {
    for (let gridX = range.minGridX; gridX <= range.maxGridX; gridX += 1) {
      const center = cellCenterAt({ gridX, gridY });
      if (pointInPolygon(center, [[shape.polygon]]))
        ids.push(encodeGridId(center));
    }
  }
  return ids;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
