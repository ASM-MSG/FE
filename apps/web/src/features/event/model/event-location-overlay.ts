import { palette, semantic } from "@fillmap/design-tokens";
import { decodeGridCorners } from "@/entities/cell";
import type {
  LabelOverlay,
  StyledCellOverlay,
} from "@/features/map-home/model/theme-overlay";
import type { EventLocationResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 행사 위치 오버레이 파생 (MSG-517 AC 6·7·8) — locations → 채색 셀·이름 라벨·격자
 * membership. 순수 함수 — 지도 SDK/플랫폼 무의존(RN 재사용 대상), 렌더는 MapCanvas 경계.
 * `buildMissionGridMembership`(MSG-462)·`route-overlay`(MSG-488) 선례.
 *
 * 색: 영역 셀은 primary(#06c) — MapCanvas가 자체 채움 40%를 적용해 Figma의 블루 틴트
 * (15518:5963, #06c 저투명)로 렌더된다. event-tint hex를 넘기면 채움 투명도와 겹쳐
 * 백색에 수렴하므로 쓰지 않는다(스펙 AC 6 "event-tint 채색"은 렌더 결과 기준으로 해석).
 * 클릭 강조는 theme-festival(#AF52DE) — Figma 보라 아웃라인(15518:5792 계열) 실측 일치.
 */

/** 격자 id → 소속 위치 id (AC 7·8) — 중복 격자는 먼저 온 위치 우선 (미션 membership 규칙) */
export const buildEventGridMembership = (
  locations: EventLocationResponseDto[],
): ReadonlyMap<string, number> => {
  const byGridId = new Map<string, number>();
  for (const location of locations) {
    for (const gridId of location.gridIds) {
      if (!byGridId.has(gridId)) byGridId.set(gridId, location.locationId);
    }
  }
  return byGridId;
};

/** 전 위치 격자의 합집합 — 클릭 라우팅의 행사 격자 예외 판정 입력 (AC 8, MapShell 배선) */
export const eventGridIdSet = (
  locations: EventLocationResponseDto[],
): ReadonlySet<string> => new Set(buildEventGridMembership(locations).keys());

/**
 * 행사 위치 영역 채색 셀 (AC 6·7) — 전 위치의 gridIds 전체.
 * 강조 위치(격자 클릭)는 보라(theme-festival) + emphasized(진한 실선 테두리)로 바뀐다.
 * 중복 격자는 membership과 같은 규칙(먼저 온 위치)으로 1회만 파생한다.
 */
export const buildEventLocationCells = (
  locations: EventLocationResponseDto[],
  highlightedLocationId: number | null,
): StyledCellOverlay[] => {
  const seen = new Set<string>();
  const cells: StyledCellOverlay[] = [];
  for (const location of locations) {
    const highlighted = location.locationId === highlightedLocationId;
    for (const gridId of location.gridIds) {
      if (seen.has(gridId)) continue;
      seen.add(gridId);
      cells.push({
        id: gridId,
        corners: decodeGridCorners(gridId),
        color: highlighted ? palette["theme-festival"] : semantic.primary,
        ...(highlighted ? { emphasized: true } : {}),
      });
    }
  }
  return cells;
};

/**
 * 위치 이름 라벨 (AC 6·7) — 대표 격자 남서 꼭짓점 기준(미션 라벨 선례).
 * 강조 위치는 이름 대신 행사명("● {행사명}" — ●은 라벨 마커의 색점이 그린다)으로 바뀐다 —
 * 같은 앵커에 이름·행사명 라벨을 겹쳐 세우지 않기 위한 교체다.
 */
export const buildEventLocationLabels = (
  locations: EventLocationResponseDto[],
  highlightedLocationId: number | null,
  eventTitle: string,
): LabelOverlay[] =>
  locations.map((location) => {
    const highlighted = location.locationId === highlightedLocationId;
    return {
      id: String(location.locationId),
      position: decodeGridCorners(location.representativeGridId)[0],
      text: highlighted ? eventTitle : location.name,
      color: highlighted ? palette["theme-festival"] : semantic.primary,
    };
  });
