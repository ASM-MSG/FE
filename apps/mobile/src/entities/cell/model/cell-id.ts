/**
 * 격자 셀 id 인코딩 — 라우트 파라미터로 쓰는 플랫폼 중립 셀 식별자 (MSG-296 AC 1).
 * 지도 탭은 임의 셀에 닿을 수 있으므로 인덱스 자체를 id로 인코딩하고,
 * mock 등록 여부 판정은 상세 모델(features/grid-detail)이 인덱스 대조로 한다.
 * grid.ts는 웹 복제본(parity 계약)이라 모바일 전용 확장은 이 파일로 분리한다.
 */
import type { GridCellIndex } from "./grid";

/** 셀 인덱스 → "cell-{col}-{row}" (음수 인덱스 허용 — 예: "cell--3--7") */
export const cellIdFor = (index: GridCellIndex): string =>
  `cell-${index.col}-${index.row}`;

const CELL_ID_PATTERN = /^cell-(-?\d+)-(-?\d+)$/;

/** "cell-{col}-{row}" → 셀 인덱스. 인코딩 형식이 아니면 null */
export const parseCellId = (cellId: string): GridCellIndex | null => {
  const match = CELL_ID_PATTERN.exec(cellId);
  if (!match) return null;
  return { col: Number(match[1]), row: Number(match[2]) };
};
