import type { GridCellIndex, LatLng } from "../../../entities/cell/model/grid";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";
import type { EventLocationResponseDto } from "../../../shared/api/sdk";
import { toMissionCells } from "../../map-home/model/mission-cells";

/**
 * 행사 위치 → 지도 셀·카메라 중심 (MSG-557 D12·D13) — 웹 `event-location-overlay.ts`의
 * 구조 이식. 웹은 StyledCellOverlay(색·강조)까지 만들지만 앱 GridMap은 `themeCells` +
 * `themeColor` 한 쌍이라 셀 인덱스만 낸다(색은 조립 훅이 `semantic.primary`로 준다).
 * 격자 스냅은 미션과 같은 규칙(`toMissionCells`)이어야 점령 층과 정렬된다. 순수 함수.
 * 2단계 확장점: 위치별 라벨·격자 탭 강조는 `grid-map.tsx` `labels[]` prop 이후.
 */

/** 전 위치 `gridIds` 합집합 → 모바일 셀. 중복 격자(위치 간 공유)는 1회만 파생한다 */
export const eventLocationCells = (
  locations: EventLocationResponseDto[],
): GridCellIndex[] =>
  toMissionCells([...new Set(locations.flatMap((loc) => loc.gridIds))]);

/** 위치 대표 격자 중심들의 평균점 — 개요 진입 시 `moveTo` 목표. 위치가 없으면 null */
export const eventLocationsCenter = (
  locations: EventLocationResponseDto[],
): LatLng | null => {
  if (locations.length === 0) return null;
  const centers = locations.map((loc) =>
    cellCenterAt(decodeGridIndex(loc.representativeGridId)),
  );
  return {
    lat: centers.reduce((sum, c) => sum + c.lat, 0) / centers.length,
    lng: centers.reduce((sum, c) => sum + c.lng, 0) / centers.length,
  };
};
