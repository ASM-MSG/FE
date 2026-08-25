import { useMemo } from "react";
import type {
  Bounds,
  GridCellIndex,
  LatLng,
} from "../../../entities/cell/model/grid";
import type { OccupiedGridResponseDto } from "../../../shared/api/sdk";
import type { HomeMissions } from "../api/use-home-missions";
import {
  buildCellGridIdIndex,
  type CellGridIdIndex,
} from "../model/cell-grid-id-index";
import { missionGridIdsInBounds } from "../model/mission";
import {
  classifyCells,
  toMissionCells,
  type CellClassification,
} from "../model/mission-cells";
import { toOccupiedCells } from "../model/occupied-grids";
import { courseRouteOf, type RouteWaypoint } from "../model/route-overlay";
import type { ThemeId } from "../model/themes";

/**
 * 확장점 ③ — 지도 오버레이 3층 파생 (MSG-427 B1·C3·D9·E14·F-12).
 *
 * **뷰-레이어 훅이다** — `MapHomeScreen` 조립 전용이고 RN 재사용 대상이 아니다(파생 자체는
 * 전부 `model/`의 순수 함수이고 여기는 메모이제이션 배선만 한다). 화면이 300줄을 넘겨
 * 떼어냈다(react-doctor no-giant-component) — MSG-428이 `clusters` 층을 붙일 자리이기도 하다.
 * 지도 SDK를 import하지 않는다: 결과는 전부 플랫폼 중립 값이고 GridMap이 SDK로 번역한다.
 */
interface HomeOverlaysInput {
  themeId: ThemeId | null;
  /** 현재 뷰포트 — 미션 타일 클리핑 범위 (F-12) */
  bounds: Bounds | null;
  /** 이 동의 핫구역 격자 id (B1) */
  hotGridIds: string[];
  missions: HomeMissions;
  occupiedGrids: OccupiedGridResponseDto[];
}

export interface HomeOverlays {
  /** 상시 점령 층 — 테마와 무관하게 항상 그린다 */
  occupiedCells: GridCellIndex[];
  occupiedGridIds: string[];
  /** 강조 대상 서버 격자 id — 상세 진입 게이트(C2)와 역인덱스(C3)의 입력이기도 하다 */
  themeGridIds: string[];
  /** 미션·핫구역 셀 ∩ 점령 셀 3분류. 테마 미선택이면 null */
  classification: CellClassification | null;
  /** 탭한 셀 → 서버 격자 id 역인덱스 (C3) */
  gridIdIndex: CellGridIdIndex;
  /** 코스 경로선 + 번호 경유지 마커 (E14) */
  route: { path: LatLng[]; waypoints: RouteWaypoint[] } | undefined;
  /** 선택 미션 이름표 (승인 Q4) */
  missionLabel: { text: string; coord: LatLng } | undefined;
}

export const useHomeOverlays = ({
  themeId,
  bounds,
  hotGridIds,
  missions,
  occupiedGrids,
}: HomeOverlaysInput): HomeOverlays => {
  // 서버 5179 격자를 모바일 격자 인덱스로 정규화 (MSG-423 승인 Q2 A안)
  const occupiedCells = useMemo(
    () => toOccupiedCells(occupiedGrids),
    [occupiedGrids],
  );
  const occupiedGridIds = useMemo(
    () => occupiedGrids.map((grid) => grid.gridId),
    [occupiedGrids],
  );

  const { selectedCourse, selectedMission, courseViews, missionViews } =
    missions;

  /**
   * 강조 격자 id — 핫구역은 서버 응답 그대로, 미션 3종은 **뷰포트 범위로 클리핑**해
   * 펼친다 (F-12). 웹에서 전 영역을 펼치던 것이 줌·이동 때마다 지도를 멈추게 했다.
   * 선택된 미션이 있으면 그 미션만 그린다 — 상세에서 다른 미션 타일이 겹치지 않게.
   */
  const themeGridIds = useMemo(() => {
    if (themeId === "hot") return hotGridIds;
    if (bounds === null) return [];
    const target = selectedCourse ?? selectedMission;
    const source = target
      ? [target]
      : missions.isRouteChip
        ? courseViews
        : missionViews;
    return source.flatMap((view) => missionGridIdsInBounds(view.shape, bounds));
  }, [
    themeId,
    hotGridIds,
    bounds,
    selectedCourse,
    selectedMission,
    missions.isRouteChip,
    courseViews,
    missionViews,
  ]);

  /** 교집합은 테마 색 대각 빗금 (D9) */
  const classification = useMemo(
    () =>
      themeId
        ? classifyCells(toMissionCells(themeGridIds), occupiedCells)
        : null,
    [themeId, themeGridIds, occupiedCells],
  );

  /**
   * 역인덱스에는 화면에 실제로 올라온 격자만 담는다 (C3). 코스 스팟은 뷰포트 밖이어도
   * 시트에서 눌러 들어갈 수 있어야 하므로 함께 담는다 (E13).
   */
  const courseSpotGridIds = useMemo(
    () => selectedCourse?.spots.map((spot) => spot.gridId) ?? [],
    [selectedCourse],
  );
  const gridIdIndex = useMemo(
    () =>
      buildCellGridIdIndex([
        ...occupiedGridIds,
        ...themeGridIds,
        ...courseSpotGridIds,
      ]),
    [occupiedGridIds, themeGridIds, courseSpotGridIds],
  );

  // 라인이 없어도(빈 path) 스팟 번호 마커는 유지한다 (MSG-473 AC 9)
  const route = useMemo(() => courseRouteOf(selectedCourse), [selectedCourse]);

  /** 이름표는 도형 bbox 중심에 하나만 — 지도가 글자로 덮이지 않게 (승인 Q4) */
  const missionLabel = useMemo(() => {
    const target = selectedCourse ?? selectedMission;
    const bbox = target?.shape.bbox;
    if (!target || !bbox) return undefined;
    return {
      text: target.title,
      coord: {
        lat: (bbox.sw.lat + bbox.ne.lat) / 2,
        lng: (bbox.sw.lng + bbox.ne.lng) / 2,
      },
    };
  }, [selectedCourse, selectedMission]);

  return {
    occupiedCells,
    occupiedGridIds,
    themeGridIds,
    classification,
    gridIdIndex,
    route,
    missionLabel,
  };
};
