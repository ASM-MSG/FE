import { palette } from "@fillmap/design-tokens";
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
 *
 * MSG-560: 셀 membership(셀 탭 → 위치, D2) · 선택 위치 강조 셀(D3) · 위치명 라벨(D3)이
 * 붙었다. 라벨은 **선택 위치 1개**뿐이다 — 전 위치 이름 라벨(`labels[]` 다중 prop)은
 * "지도가 글자로 덮이지 않는 최소 범위"(grid-map `missionLabel` 원칙)를 깨므로 미도입.
 */

/** 전 위치 `gridIds` 합집합 → 모바일 셀. 중복 격자(위치 간 공유)는 1회만 파생한다 */
export const eventLocationCells = (
  locations: EventLocationResponseDto[],
): GridCellIndex[] => toMissionCells(locations.flatMap((loc) => loc.gridIds)); // 중복 제거는 toMissionCells가 셀 키 기준으로 한다

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

const cellKey = ({ col, row }: GridCellIndex): string => `${col}:${row}`;

/**
 * 모바일 셀 키 → 소속 위치 id (D2) — 중복 셀은 **먼저 온 위치 우선**(웹
 * `buildEventGridMembership` 규칙). 셀 접기는 `toMissionCells`가 단일 정본이라
 * 채색 층과 판정이 어긋나지 않는다.
 */
export const eventCellMembership = (
  locations: EventLocationResponseDto[],
): ReadonlyMap<string, number> => {
  const byCell = new Map<string, number>();
  for (const location of locations) {
    for (const cell of toMissionCells(location.gridIds)) {
      const key = cellKey(cell);
      if (!byCell.has(key)) byCell.set(key, location.locationId);
    }
  }
  return byCell;
};

/** 탭한 셀의 소속 위치 — 행사 셀이 아니면 null(무동작) [D2] */
export const eventLocationIdAt = (
  membership: ReadonlyMap<string, number>,
  cell: GridCellIndex,
): number | null => membership.get(cellKey(cell)) ?? null;

/** 선택 위치의 강조 셀 (D3) — 공유 셀은 membership과 같은 규칙으로 먼저 온 위치에 남는다 */
export const eventLocationAccent = (
  locations: EventLocationResponseDto[],
  locationId: number,
): GridCellIndex[] => {
  const target = locations.find(
    (location) => location.locationId === locationId,
  );
  if (target === undefined) return [];
  const membership = eventCellMembership(locations);
  return toMissionCells(target.gridIds).filter(
    (cell) => membership.get(cellKey(cell)) === locationId,
  );
};

/**
 * 선택 위치 이름표 (D3) — 텍스트는 **위치명**, 앵커는 대표 격자 셀 중심.
 * 웹의 "강조 시 행사명으로 교체"는 같은 앵커에 이름 라벨이 이미 서 있어 겹침을 피하려는
 * 교체인데(웹 `event-location-overlay.ts:66-68`), 앱에는 비선택 이름 라벨이 없어 성립하지 않는다.
 */
export const eventLocationLabel = (
  location: EventLocationResponseDto,
): { text: string; coord: LatLng; color: string } => ({
  text: location.name,
  coord: cellCenterAt(decodeGridIndex(location.representativeGridId)),
  // 강조 셀과 같은 festival 색 — 없으면 GridMap이 themeColor(primary)로 폴백해 셀과 라벨 색이 갈린다
  color: palette["theme-festival"],
});

/**
 * 강조 셀을 뺀 나머지 위치 셀 (D3) — 두 채색 층이 같은 셀에 겹쳐 색이 섞이는 것을 막는다.
 * 강조가 없으면(개요) 전 위치 셀 그대로다.
 */
export const eventBaseCells = (
  locations: EventLocationResponseDto[],
  accentCells: GridCellIndex[],
): GridCellIndex[] => {
  if (accentCells.length === 0) return eventLocationCells(locations);
  const accent = new Set(accentCells.map(cellKey));
  return eventLocationCells(locations).filter(
    (cell) => !accent.has(cellKey(cell)),
  );
};
