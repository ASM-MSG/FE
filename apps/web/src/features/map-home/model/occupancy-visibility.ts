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
