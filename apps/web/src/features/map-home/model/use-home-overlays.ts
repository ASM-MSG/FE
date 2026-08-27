import { useMemo } from "react";
import type { Bounds } from "@/entities/cell";
import {
  buildCourseLabels,
  buildCourseRoutes,
  buildMissionCells,
  buildMissionLabels,
} from "./mission-overlay";
import type { CourseView, MissionView } from "./mission-view";
import { hotCellsVisible, missionCellsVisible } from "./occupancy-visibility";
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
 * **목록 파생은 확정 영역으로 잘린다** — 전국 미션을 다 그리면 폴리곤이 1만 개를 넘어
 * 줌·이동이 멈춘다(mission-overlay 주석). 영역이 없으면(지도 준비 전) 빈 목록이다.
 * 단 **상세를 연 미션·코스는 자기 경계로 그린다** (MSG-403 후속): 코스를 고르면 지도가
 * 그 코스로 이동하는데, 확정 영역으로 자르면 이동한 화면에서 라인·마커가 사라진다.
 * 대상이 하나뿐이라 전개 비용도 그 미션의 격자 수로 묶인다.
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
  /** 현재 줌 단 — 저줌에서 미션 격자를 집계 마커에 넘기는 게이트 (MSG-451 AC 2·3) */
  zoom: number;
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
  zoom,
}: HomeOverlaysInput): HomeOverlays => {
  // 상세 대상의 경계 — 있으면 클리핑 기준이 된다(자기 자신은 항상 포함).
  // 경계가 없는 미션(좌표 없는 shape)은 확정 영역으로 떨어진다
  const detailBounds: Bounds | null =
    (selectedCourse ?? selectedMission)?.shape.bbox ?? viewportBounds;

  // 저줌에서는 목록 상태의 미션 격자·이름표를 집계 마커에 넘긴다 (MSG-451 AC 2·3).
  // 코스는 라인 표시라 대상이 아니다 — 티켓 제외 범위(1km 화면 묶음 유지)
  const missionLayerHidden =
    eventChip !== null &&
    !missionCellsVisible({ zoom, hasDetailTarget: selectedMission !== null });

  const cells = useMemo(() => {
    // 핫 칩 저줌에서는 핫 격자 낱개 대신 행정 단위 집계 마커가 선다 (MSG-475 AC 11·12) —
    // 셀을 비우면 MapShell의 useHotZoneAggregationQuery 마커 층이 그 자리를 대신한다
    if (activeTheme === "hot")
      return hotCellsVisible({ zoom })
        ? buildHomeOverlayCells("hot", hotCells, occupiedIds)
        : [];
    if (viewportBounds === null) return [];
    if (missionLayerHidden) return [];
    if (isRouteChip)
      return buildMissionCells(
        selectedCourse ? [selectedCourse] : courseViews,
        THEME_META.route.color,
        occupiedIds,
        focusedMissionId,
        selectedCourse ? (detailBounds ?? viewportBounds) : viewportBounds,
      );
    if (eventChip !== null)
      return buildMissionCells(
        selectedMission ? [selectedMission] : missionViews,
        THEME_META[eventChip].color,
        occupiedIds,
        focusedMissionId,
        selectedMission ? (detailBounds ?? viewportBounds) : viewportBounds,
      );
    return [];
  }, [
    detailBounds,
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
    missionLayerHidden,
    zoom,
  ]);

  // 코스 라인 — 상세를 열면 그 코스만 남긴다 (AC 18의 코스판)
  const routes = useMemo(() => {
    if (!isRouteChip || viewportBounds === null) return [];
    return buildCourseRoutes(
      selectedCourse ? [selectedCourse] : courseViews,
      THEME_META.route.color,
      selectedCourse ? (detailBounds ?? viewportBounds) : viewportBounds,
    );
  }, [isRouteChip, courseViews, selectedCourse, detailBounds, viewportBounds]);

  const labels = useMemo(() => {
    if (viewportBounds === null) return [];
    // 격자를 걷은 줌에서는 이름표도 함께 걷는다 — 이름표 좌표가 격자 꼭짓점이라
    // 셀 없이 남으면 집계 마커 위에 뜬 미아가 된다 (MSG-451 AC 2 해석)
    if (missionLayerHidden) return [];
    if (isRouteChip)
      return buildCourseLabels(
        selectedCourse ? [selectedCourse] : courseViews,
        THEME_META.route.color,
        selectedCourse ? (detailBounds ?? viewportBounds) : viewportBounds,
      );
    if (eventChip !== null)
      return buildMissionLabels(
        selectedMission ? [selectedMission] : missionViews,
        THEME_META[eventChip].color,
        selectedMission ? selectedMission.missionId : focusedMissionId,
        selectedMission ? (detailBounds ?? viewportBounds) : viewportBounds,
      );
    return [];
  }, [
    detailBounds,
    eventChip,
    isRouteChip,
    courseViews,
    missionViews,
    selectedCourse,
    selectedMission,
    focusedMissionId,
    viewportBounds,
    missionLayerHidden,
  ]);

  return { cells, routes, labels };
};
