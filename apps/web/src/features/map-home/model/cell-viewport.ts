import type { Bounds, Cell } from "@/entities/cell";

/** 뷰포트 요약 수치 */
export interface CellSummary {
  cellCount: number;
  videoCount: number;
}

/**
 * 중심 좌표가 bounds(남서~북동) 안(경계 포함)에 있는 격자만 반환한다. [L1]
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 */
export const filterCellsInBounds = (cells: Cell[], bounds: Bounds): Cell[] =>
  cells.filter(
    ({ center }) =>
      center.lat >= bounds.sw.lat &&
      center.lat <= bounds.ne.lat &&
      center.lng >= bounds.sw.lng &&
      center.lng <= bounds.ne.lng,
  );

/** 격자 수와 영상 수 합계를 집계한다. 빈 배열이면 0·0. [L2, L4] */
export const summarizeCells = (cells: Cell[]): CellSummary => ({
  cellCount: cells.length,
  videoCount: cells.reduce((sum, cell) => sum + cell.videoCount, 0),
});

/**
 * 영상 수 내림차순 상위 n개 격자를 반환한다. 동률이면 id 오름차순 안정 정렬. [L3]
 * 원본 배열은 변형하지 않는다.
 */
export const topCellsByVideo = (cells: Cell[], n = 3): Cell[] =>
  [...cells]
    .sort((a, b) => b.videoCount - a.videoCount || a.id.localeCompare(b.id))
    .slice(0, n);
