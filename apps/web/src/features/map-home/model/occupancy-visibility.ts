import { GRID_MIN_ZOOM } from "./grid-overlay";
import type { ThemeId } from "./theme";
import type { StyledCellOverlay } from "./theme-overlay";

/**
 * 상시 점령 층 표시 여부 (MSG-403 AC 1·2).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 점령 격자는 셸이 전 섹션에 상시로 그리는 층인데(MSG-263 D9), 칩을 켜면 "그 칩의 대상만"
 * 보여야 한다는 기획과 부딪힌다 — 특히 줌아웃하면 화면이 내 점령 격자(와 그 클러스터)로
 * 덮여 핫구역이 묻힌다. 칩이 켜진 동안에는 이 층을 통째로 비운다.
 * 칩 대상과 겹치는 격자의 빗금 표시는 테마 셀 쪽 파생(buildHomeOverlayCells)이 그리므로
 * 여기서 비워도 사라지지 않는다.
 */
const EMPTY: StyledCellOverlay[] = [];

export const visibleOccupiedCells = (
  cells: StyledCellOverlay[],
  activeTheme: ThemeId | null,
): StyledCellOverlay[] => (activeTheme === null ? cells : EMPTY);

/**
 * 축제·팝업 칩의 미션 격자를 그릴지 (MSG-451 AC 2·3).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 줌아웃하면 미션 격자 대신 행정 단위 집계 마커가 그 자리를 대신한다(MSG-437 확정) —
 * 종전에는 아무리 줌아웃해도 격자가 그대로 남아 시 단위 화면이 100m 칸으로 뒤덮였다.
 * 임계는 개별 격자 층과 같은 `GRID_MIN_ZOOM`이다: 두 층이 같은 줌에서 갈려야 칩을
 * 켜고 끌 때 표시 방식이 튀지 않는다.
 *
 * **상세를 연 대상은 예외다**: 칩 진입이 최근접 대상으로 지도를 옮기는데(AC 13), 그
 * 화면의 줌이 저줌이면 여기서 격자까지 걷어 도착지가 텅 빈 채로 남는다.
 */
export const missionCellsVisible = ({
  zoom,
  hasDetailTarget,
}: {
  zoom: number;
  /** 상세를 연 미션·코스가 있는지 — 있으면 그 하나만 자기 경계로 그린다 */
  hasDetailTarget: boolean;
}): boolean => hasDetailTarget || zoom >= GRID_MIN_ZOOM;

/**
 * 핫구역 칩의 핫 격자를 그릴지 (MSG-475 AC 11) — `missionCellsVisible`의 형제.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 줌아웃하면 핫 격자 낱개 대신 행정 단위 집계 마커(`useHotZoneAggregationQuery`)가
 * 그 자리를 대신한다 — 종전에는 전국 상위 50 격자가 저줌에서 점으로 뭉개진 채 남았다.
 * 임계는 개별 격자 층과 같은 `GRID_MIN_ZOOM`. 미션과 달리 상세 예외가 없다 —
 * 핫구역엔 상세를 여는 대상이 없다 (스펙 추정 8).
 */
export const hotCellsVisible = ({ zoom }: { zoom: number }): boolean =>
  zoom >= GRID_MIN_ZOOM;
