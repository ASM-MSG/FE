import { useMemo } from "react";
import type { Bounds } from "@/entities/cell";
import {
  buildCourseLabels,
  buildCourseRoutes,
  buildMissionCells,
  buildMissionLabels,
} from "./mission-overlay";
import type { CourseView, MissionView } from "./mission-view";
import { THEME_META, type ThemeCell, type ThemeId } from "./theme";
import {
  buildHomeOverlayCells,
  type LabelOverlay,
  type RouteOverlay,
  type StyledCellOverlay,
} from "./theme-overlay";

/**
 * 홈 지도 오버레이 파생 (MSG-395) — 칩별로 소스가 다른 셀·라인·이름표를 한 곳에서 만든다.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 페이지에서 뽑아낸 이유(리뷰 반영 — 컴포넌트 300줄 초과): 세 갈래 분기가 각각 10줄
 * 남짓한 useMemo인데 의존성이 겹쳐, 페이지 본문에 두면 조립 코드와 파생 코드가 뒤섞여
 * 읽기 어렵다. 파생은 순수하므로 훅으로 떼면 페이지는 배선만 남는다.
 *
 * **모든 파생은 뷰포트로 잘린다** — 전국 미션을 다 그리면 폴리곤이 1만 개를 넘어
 * 줌·이동이 멈춘다(mission-overlay 주석). 뷰포트가 없으면(지도 준비 전) 빈 목록이다.
 */
interface HomeOverlaysInput {
  activeTheme: ThemeId | null;
  /** 축제·팝업 칩 (경로추천이면 null) */
  eventChip: Extract<ThemeId, "festival" | "popup"> | null;
  isRouteChip: boolean;
  /** 핫구역 칩의 강조 셀 — 현재 행정동의 핫구역 격자 */
  hotCells: ThemeCell[];
  missionViews: MissionView[];
  courseViews: CourseView[];
  /** 상세를 연 미션·코스 — 있으면 그것만 그린다 (AC 18) */
  selectedMission: MissionView | null;
  selectedCourse: CourseView | null;
  /** 강조 대상 — 호버 > 선택 순 (호버가 더 즉각적인 의도다) */
  focusedMissionId: number | null;
  occupiedIds: string[];
  viewportBounds: Bounds | null;
}

export interface HomeOverlays {
  cells: StyledCellOverlay[];
  routes: RouteOverlay[];
  labels: LabelOverlay[];
}

export const useHomeOverlays = ({
  activeTheme,
  eventChip,
  isRouteChip,
  hotCells,
  missionViews,
  courseViews,
  selectedMission,
  selectedCourse,
  focusedMissionId,
  occupiedIds,
  viewportBounds,
}: HomeOverlaysInput): HomeOverlays => {
  const cells = useMemo(() => {
    if (activeTheme === "hot")
      return buildHomeOverlayCells("hot", hotCells, occupiedIds);
    if (viewportBounds === null) return [];
    if (isRouteChip)
      return buildMissionCells(
        selectedCourse ? [selectedCourse] : courseViews,
        THEME_META.route.color,
        occupiedIds,
        focusedMissionId,
        viewportBounds,
      );
    if (eventChip !== null)
      return buildMissionCells(
        selectedMission ? [selectedMission] : missionViews,
        THEME_META[eventChip].color,
        occupiedIds,
        focusedMissionId,
        viewportBounds,
      );
    return [];
  }, [
    activeTheme,
    eventChip,
    isRouteChip,
    hotCells,
    occupiedIds,
    missionViews,
    courseViews,
    selectedMission,
    selectedCourse,
    focusedMissionId,
    viewportBounds,
  ]);

  // 코스 라인 — 상세를 열면 그 코스만 남긴다 (AC 18의 코스판)
  const routes = useMemo(() => {
    if (!isRouteChip || viewportBounds === null) return [];
    return buildCourseRoutes(
      selectedCourse ? [selectedCourse] : courseViews,
      THEME_META.route.color,
      viewportBounds,
    );
  }, [isRouteChip, courseViews, selectedCourse, viewportBounds]);

  const labels = useMemo(() => {
    if (viewportBounds === null) return [];
    if (isRouteChip)
      return buildCourseLabels(
        selectedCourse ? [selectedCourse] : courseViews,
        THEME_META.route.color,
        viewportBounds,
      );
    if (eventChip !== null)
      return buildMissionLabels(
        selectedMission ? [selectedMission] : missionViews,
        THEME_META[eventChip].color,
        selectedMission ? selectedMission.missionId : focusedMissionId,
        viewportBounds,
      );
    return [];
  }, [
    eventChip,
    isRouteChip,
    courseViews,
    missionViews,
    selectedCourse,
    selectedMission,
    focusedMissionId,
    viewportBounds,
  ]);

  return { cells, routes, labels };
};
