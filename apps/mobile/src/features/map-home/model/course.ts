import type { LatLng } from "../../../entities/cell/model/grid";
import type { CourseSpotDto } from "./mission";

/**
 * 코스(COURSE) 미션 기하·순서 파생 (MSG-427 E7·E14·E15) — 웹
 * `features/map-home/model/course.ts`의 복제본.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 * 동등성은 course.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 */

/**
 * 코스 라인 GeoJSON LineString → 좌표 배열. [E15 · MSG-473 AC 1~3]
 * 서버는 라인을 GeoJSON **객체**로 주고(실측), 명세 이력상 문자열 원문일 수도 있다 —
 * 문자열이면 먼저 파싱하고, 객체면 파싱 없이 같은 검증 경로로 합류한다.
 * GeoJSON은 `[경도, 위도]` 순서다 — 뒤집으면 라인이 엉뚱한 곳에 그려진다.
 * `missions.path`는 NULL 허용 컬럼이고 형식이 깨져 올 수도 있어, 실패는 빈 배열로
 * 흡수한다 — 라인 없이 포토스팟 마커만 그린다.
 */
export const parseLineString = (line: unknown): LatLng[] => {
  let parsed: unknown = line;
  if (typeof line === "string") {
    try {
      parsed = JSON.parse(line);
    } catch {
      return [];
    }
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { type?: unknown }).type !== "LineString"
  )
    return [];

  const coordinates = (parsed as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates)) return [];

  return coordinates
    .filter(
      (pair): pair is [number, number] =>
        Array.isArray(pair) &&
        typeof pair[0] === "number" &&
        typeof pair[1] === "number",
    )
    .map(([lng, lat]) => ({ lat, lng }));
};

/** 표시용 포토스팟 — 코스 순번(1부터)과 방문 여부가 붙는다 */
export interface CourseSpot {
  gridId: string;
  position: LatLng;
  /** 화면 표시 번호 — 서버 seq가 비어도 목록 순서로 1부터 매긴다 */
  order: number;
  visited: boolean;
}

/**
 * 포토스팟을 코스 순서로 정렬하고 방문을 판정한다. [E7]
 * `seq`는 NULL 허용 컬럼이라 없는 스팟은 뒤로 보낸다(같은 순번끼리는 입력 순서 유지 —
 * `sort`는 ES2019부터 안정 정렬). 방문 격자 집합의 출처는 미션 상세의 `spotStats[].visited`다 (E10).
 *
 * Hermes(RN 0.86)에 `toSorted` 미구현 — 스프레드 복사+`sort`로 비파괴를 지킨다.
 */
export const courseSpots = (
  spots: CourseSpotDto[],
  collectedGridIds: ReadonlySet<string>,
): CourseSpot[] =>
  [...spots]
    .sort(
      (a, b) =>
        (a.seq ?? Number.MAX_SAFE_INTEGER) - (b.seq ?? Number.MAX_SAFE_INTEGER),
    )
    .map((spot, index) => ({
      gridId: spot.gridId,
      position: { lat: spot.lat, lng: spot.lng },
      order: index + 1,
      visited: collectedGridIds.has(spot.gridId),
    }));

/**
 * 지도에 그릴 코스 연결선 좌표. [MSG-473 — 스팟 직선 폴백 제거]
 * 서버 라인(`shape.line`)만 그린다. 라인이 없거나 깨졌으면 **빈 배열** — 스팟은 촬영
 * 지점이지 이동 경로가 아니라, 직선으로 이으면 실경로와 다른 길(만 횡단 등)이 그려진다.
 * MSG-403 당시 넣었던 스팟 순 직선 폴백은 실 데이터 코스가 전부 라인을 갖게 되면서
 * 번복됐다(사용자 승인) — 라인 없는 코스는 번호 마커만 남는다.
 */
export const coursePath = (line: unknown): LatLng[] => parseLineString(line);

/** 순환형 판정 거리(m) — 격자 한 변과 같은 눈금 */
const LOOP_THRESHOLD_METERS = 100;

const EARTH_RADIUS_METERS = 6_371_000;

/** 두 좌표 사이 거리(m) — 하버사인 */
const distanceMeters = (a: LatLng, b: LatLng): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
};

/**
 * 순환/비순환 판별. [E5]
 * 서버 DTO에 코스 형태 필드가 없어 라인 시작·끝점의 근접으로 대신한다.
 */
export const isLoopCourse = (path: LatLng[]): boolean =>
  path.length >= 2 &&
  distanceMeters(path[0], path[path.length - 1]) <= LOOP_THRESHOLD_METERS;
