import {
  gridNodeAt,
  type CellCorners,
  type GridCellIndex,
} from "@/entities/cell";
import type { EventSubmissionAreaRectDto } from "@/shared/api/generated/types.gen";

/**
 * 위치 영역 지정 판정 — 순수 로직 (MSG-547 AC 2~8·14).
 * 지도 SDK·React·플랫폼 API를 참조하지 않는다 — RN 재사용 대상. 좌표 산술은 신설하지 않고
 * 격자 정본(`entities/cell/grid`)의 `gridNodeAt`만 조합한다(티켓 요구).
 *
 * 서버 계약은 합집합 81칸만 판정한다 — 한 변 상한은 FE 경고이고 확정을 막지 않는다
 * (2026-09-01 B안 확정: 관리자 심사가 최종 판단).
 */

/**
 * 영역 사각형 — 서버 요청 DTO를 그대로 쓴다(dex 선례의 type-only 파생).
 * 필드가 `entities/cell`의 `GridRange`와 완전 동형이다(둘 다 BE GridEncoder 정본)
 * — 뷰포트 범위와 의미가 달라 별도 이름을 유지한다.
 */
export type AreaRect = EventSubmissionAreaRectDto;

/** 위치 하나의 합집합 상한 — 서버 판정과 같은 값(9×9) */
export const AREA_CELL_LIMIT = 81;

/** 한 변 경고 임계 — 이 칸 수를 **넘으면** 경고만 하고 확정은 허용한다 (AC 8) */
export const SIDE_WARN_CELLS = 10;

/** 사각형의 가로·세로 칸 수 (양끝 포함) */
export interface AreaRectSpan {
  cols: number;
  rows: number;
}

/**
 * 드래그 시작 셀 ↔ 현재 셀 → 격자 스냅 사각형 (AC 2).
 * 어느 방향으로 끌어도 min/max로 정규화되고, 같은 셀이면 1×1이다(클릭 지정 — AC 3).
 */
export const toDragRect = (
  anchor: GridCellIndex,
  current: GridCellIndex,
): AreaRect => ({
  minGridX: Math.min(anchor.gridX, current.gridX),
  maxGridX: Math.max(anchor.gridX, current.gridX),
  minGridY: Math.min(anchor.gridY, current.gridY),
  maxGridY: Math.max(anchor.gridY, current.gridY),
});

export const rectSpan = (rect: AreaRect): AreaRectSpan => ({
  cols: rect.maxGridX - rect.minGridX + 1,
  rows: rect.maxGridY - rect.minGridY + 1,
});

export const rectCellCount = (rect: AreaRect): number => {
  const { cols, rows } = rectSpan(rect);
  return cols * rows;
};

/** 후보 카드의 크기 문구 (Figma 15525:9300) */
export const rectSizeLabel = (rect: AreaRect): string => {
  const { cols, rows } = rectSpan(rect);
  return `가로 ${cols}칸 × 세로 ${rows}칸 · ${cols * rows}칸`;
};

/** "이 위치의 영역" 목록 행 문구 — index는 0-based (AC 5) */
export const areaRowLabel = (rect: AreaRect, index: number): string => {
  const { cols, rows } = rectSpan(rect);
  return `영역 ${index + 1} · 가로 ${cols} × 세로 ${rows} · ${cols * rows}칸`;
};

/** 후보를 추가했을 때의 합집합 예고 문구 (AC 2) */
export const addPreviewLabel = (unionAfter: number): string =>
  `추가하면 ${unionAfter} / ${AREA_CELL_LIMIT}칸`;

/**
 * 사각형 합집합의 칸 수 — 겹친 칸은 1회만 센다 (AC 5).
 * 셀 집합으로 센다: 확정 합집합은 상한(81칸)에 묶이고 후보는 1개라 규모가 작다.
 */
export const unionCellCount = (rects: AreaRect[]): number => {
  const cells = new Set<string>();
  for (const rect of rects) {
    for (let gridY = rect.minGridY; gridY <= rect.maxGridY; gridY++) {
      for (let gridX = rect.minGridX; gridX <= rect.maxGridX; gridX++) {
        cells.add(`${gridY}_${gridX}`);
      }
    }
  }
  return cells.size;
};

/** 후보 판정 결과 — 차단(상한)과 경고(한 변)를 분리해 돌려준다 */
export interface AreaCandidateJudgement {
  /** 추가했을 때의 합집합 칸 수 */
  unionAfter: number;
  /** 상한 초과 — 추가 불가 (AC 7) */
  blocked: boolean;
  /** 한 변 초과 — 추가 허용, 경고만 (AC 8). 차단과 겹치면 차단이 우선해 false다 */
  sideWarning: boolean;
}

/**
 * 후보 사각형 판정 (AC 7·8) — 확정 영역과의 합집합으로 상한을 보고,
 * 한 변 초과는 경고로만 남긴다. **차단이 경고에 우선한다**: 두 사유를 동시에 보이면
 * 사용자가 무엇 때문에 막혔는지 흐려지므로 차단 시 경고를 내리지 않는다.
 */
export const judgeCandidate = (
  confirmed: AreaRect[],
  candidate: AreaRect,
): AreaCandidateJudgement => {
  const unionAfter = unionCellCount([...confirmed, candidate]);
  const blocked = unionAfter > AREA_CELL_LIMIT;
  const { cols, rows } = rectSpan(candidate);
  return {
    unionAfter,
    blocked,
    sideWarning: !blocked && (cols > SIDE_WARN_CELLS || rows > SIDE_WARN_CELLS),
  };
};

/**
 * 후보의 차단·경고 사유 문구 (AC 7·8) — 문제 없으면 null.
 * 시안에 상태 프레임이 없어 FE 확정 문구다(스펙 추정 10).
 */
export const candidateIssueMessage = ({
  blocked,
  sideWarning,
}: AreaCandidateJudgement): string | null => {
  if (blocked) {
    return "상한 초과 — 아래 목록에서 영역을 삭제한 뒤 다시 추가해 주세요";
  }
  if (sideWarning) {
    return `한 변이 ${SIDE_WARN_CELLS}칸을 넘어요 — 심사 단계에서 조정될 수 있어요`;
  }
  return null;
};

/**
 * 사각형 → 지도 폴리곤 꼭짓점 4점 (남서→남동→북동→북서 — 셀 링과 같은 순서, AC 14).
 * 격자 교점은 셀의 남서 꼭짓점이므로 북·동 변은 max+1 교점을 쓴다.
 */
export const rectCornersAt = (rect: AreaRect): CellCorners => [
  gridNodeAt({ gridX: rect.minGridX, gridY: rect.minGridY }),
  gridNodeAt({ gridX: rect.maxGridX + 1, gridY: rect.minGridY }),
  gridNodeAt({ gridX: rect.maxGridX + 1, gridY: rect.maxGridY + 1 }),
  gridNodeAt({ gridX: rect.minGridX, gridY: rect.maxGridY + 1 }),
];
