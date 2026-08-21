import { GRID_MIN_ZOOM } from "./grid-overlay";
import type { StyledCellOverlay } from "./theme-overlay";

/**
 * 채움 셀 줌 게이트 (MSG-264 AC 1·2 → MSG-403 AC 7 → MSG-410 AC 10 존치).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * FE 로컬 클러스터 산술(buildClusterMarkers·윈도 스냅)은 MSG-410에서 서버 집계
 * (`GET /api/grids/aggregation` → region-cluster-overlay)로 대체되어 삭제됐다 —
 * 이 게이트만 남아 저줌에서 채움 셀을 걷는다.
 */

/**
 * 채움 셀 줌 게이트 — 셸 합성 계층에서 병합된 오버레이 셀에 적용한다.
 * zoom < GRID_MIN_ZOOM이면 점령·무테마 셀을 걷어 서버 집계 마커로 넘긴다(기존 계약).
 *
 * MSG-403 AC 7: **칩 대상 셀(테마 색 보유)은 저줌에서도 채움으로 남긴다** — 칩은 축척
 * 500m·1km로 줌아웃한 화면에서 데이터를 보여주는 것이 목적인데, 여기서 걷히면 그 줌에서
 * 축제 타일·코스 라인 주변 격자가 통째로 사라진다(집계 마커로는 영역 모양이 안 읽힌다).
 * 색 유무가 판별자인 이유: 점령 셀과 강조 전용 셀만 색이 없다(buildHomeOverlayCells 계약).
 */
export const gateFillCells = (
  cells: StyledCellOverlay[],
  zoom: number,
): StyledCellOverlay[] =>
  zoom >= GRID_MIN_ZOOM
    ? cells
    : cells.filter((cell) => cell.color !== undefined);
