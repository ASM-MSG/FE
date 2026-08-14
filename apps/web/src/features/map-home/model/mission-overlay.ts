import { decodeGridCorners, type Bounds, type LatLng } from "@/entities/cell";
import { boundsIntersect, missionGridIdsInBounds } from "./mission";
import type { CourseView, MissionView } from "./mission-view";
import type {
  LabelOverlay,
  RouteOverlay,
  StyledCellOverlay,
} from "./theme-overlay";

/**
 * 미션·코스 지도 오버레이 파생 (MSG-395 AC 15·16·18·21).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 렌더(naver Polygon·Polyline·Marker)는 MapCanvas 경계 안에서 한다.
 *
 * **모든 파생이 뷰포트로 잘린다** (사용자 렉 보고 후 개정): 전국 미션의 격자를 다 그리면
 * 폴리곤이 1만 개를 넘어 줌·이동이 멈췄다. 화면 밖 도형은 어차피 보이지 않는다.
 */

/** 뷰포트에 걸치는 미션만 — 지도 파생의 1차 관문 */
export const missionsInBounds = <T extends MissionView>(
  views: T[],
  bounds: Bounds,
): T[] =>
  views.filter(
    (view) =>
      view.shape.bbox !== null && boundsIntersect(view.shape.bbox, bounds),
  );

/**
 * 미션 격자 → 타일 목록. [AC 15·16]
 * 서버 shape가 주는 격자 집합을 그대로 칸으로 옮기므로 축제별 m×n 모양이 지도에 재현된다.
 * 두 미션이 같은 격자를 덮을 수 있어 격자 id로 합치되, **포커스된 미션의 강조는 살린다** —
 * 먼저 그려진 미션이 이겨 버리면 호버한 미션의 테두리가 안 뜬다.
 * 내 점령과 겹치는 칸의 빗금은 핫구역과 같은 규칙이다(테마 셀 ∩ 내 점령).
 */
export const buildMissionCells = (
  views: MissionView[],
  color: string,
  occupiedGridIds: string[],
  focusedMissionId: number | null,
  bounds: Bounds,
): StyledCellOverlay[] => {
  const occupied = new Set(occupiedGridIds);
  const byGridId = new Map<string, StyledCellOverlay>();

  for (const view of missionsInBounds(views, bounds)) {
    const emphasized = view.missionId === focusedMissionId;
    for (const gridId of missionGridIdsInBounds(view.shape, bounds)) {
      const existing = byGridId.get(gridId);
      if (existing && !emphasized) continue;
      byGridId.set(gridId, {
        id: gridId,
        corners: decodeGridCorners(gridId),
        color,
        hatched: occupied.has(gridId),
        ...(emphasized ? { emphasized: true } : {}),
      });
    }
  }

  return [...byGridId.values()];
};

/**
 * 포커스된 미션의 이름표. [AC 16·18]
 * 목록만 보고 있을 때 모든 미션에 이름표를 띄우면 지도가 글자로 덮인다 — Figma도
 * 호버·선택 상태에서만 이름표를 그린다.
 */
export const buildMissionLabels = (
  views: MissionView[],
  color: string,
  focusedMissionId: number | null,
  bounds: Bounds,
): LabelOverlay[] => {
  if (focusedMissionId === null) return [];

  const focused = views.find((view) => view.missionId === focusedMissionId);
  if (focused === undefined) return [];

  const anchorGridId = missionGridIdsInBounds(focused.shape, bounds)[0];
  if (anchorGridId === undefined) return [];

  return [
    {
      id: String(focused.missionId),
      // 이름표를 놓을 좌표 — 격자 남서 꼭짓점(타일 왼쪽 아래)
      position: decodeGridCorners(anchorGridId)[0],
      text: focused.title,
      color,
    },
  ];
};

/**
 * 코스별 라인 + 번호 경유지. [AC 21]
 * 라인이 없는 코스(`shape.line` null·파싱 실패)는 빈 path로 남아 마커만 그려진다.
 * 화면에 걸치는 코스만 그린다 — 전국 코스가 148개라 전부 그리면 마커만 1000개다.
 */
export const buildCourseRoutes = (
  courses: CourseView[],
  color: string,
  bounds: Bounds,
): RouteOverlay[] =>
  missionsInBounds(courses, bounds).map((course) => ({
    id: String(course.missionId),
    path: course.path,
    waypoints: course.spots.map((spot) => ({
      seq: spot.order,
      position: spot.position,
    })),
    color,
  }));

/** 좌표가 뷰포트 안인가 — 이름표 앵커를 화면 안에서 고르기 위한 판정 */
const pointInBounds = (point: LatLng, bounds: Bounds): boolean =>
  point.lat >= bounds.sw.lat &&
  point.lat <= bounds.ne.lat &&
  point.lng >= bounds.sw.lng &&
  point.lng <= bounds.ne.lng;

/**
 * 코스명 이름표 — 코스는 목록에서도 항상 이름표를 띄운다. [AC 21]
 * 미션 타일과 달리 라인은 어느 코스인지 모양만으로 구분되지 않고, 뷰포트로 잘린 뒤에는
 * 동시에 뜨는 수도 적어 글자가 지도를 덮지 않는다.
 *
 * 앵커는 **화면 안에 든 첫 스팟**이다 (리뷰 반영) — `missionsInBounds`는 코스 전체
 * 경계만 보므로, 14km짜리 코스의 중간 구간을 보고 있으면 bbox는 겹쳐도 `spots[0]`은
 * 화면 밖이라 이름표가 안 보이는 자리에 그려진다. `buildMissionLabels`가 격자를
 * 뷰포트 안에서 다시 고르는 것과 같은 규칙이다.
 */
export const buildCourseLabels = (
  courses: CourseView[],
  color: string,
  bounds: Bounds,
): LabelOverlay[] =>
  missionsInBounds(courses, bounds).flatMap((course) => {
    const anchor = course.spots.find((spot) =>
      pointInBounds(spot.position, bounds),
    );
    if (anchor === undefined) return [];
    return [
      {
        id: String(course.missionId),
        position: anchor.position,
        text: course.title,
        color,
      },
    ];
  });
