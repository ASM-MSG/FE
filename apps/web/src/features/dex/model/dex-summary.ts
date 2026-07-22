import type { CollectedCell, DexData } from "@/entities/dex";
import {
  CELL_SIDE_METERS,
  cellToBounds,
  type CellOverlay,
} from "./cell-overlay";

/**
 * 도감 화면 파생 로직 (AC 7·14·17).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 */

/** 탐험률을 0~100으로 클램프한다 — 음수·100 초과 입력 방어. [AC 7] */
export const clampPct = (value: number): number =>
  Math.min(100, Math.max(0, value));

/**
 * 수집 격자를 collectedAt 내림차순(최신순)으로 정렬한다. [AC 14]
 * 동률 시 cellId 오름차순 안정 정렬, 원본 배열은 변형하지 않는다(explore sortCells 패턴).
 */
export const sortByCollectedAtDesc = (
  cells: CollectedCell[],
): CollectedCell[] =>
  [...cells].sort(
    (a, b) =>
      b.collectedAt.localeCompare(a.collectedAt) ||
      a.cellId.localeCompare(b.cellId),
  );

/** 도감 화면이 소비하는 파생 뷰 모델 — 요약(클램프 적용) + 최신순 목록 + 오버레이 */
export interface DexView {
  nickname: string;
  avatarSrc?: string;
  totalLabel: string;
  /** 0~100 클램프 적용 완료 값 */
  totalExploredPct: number;
  streakDays: number;
  collectedCellCount: number;
  badgeCount: number;
  regionName: string;
  /** 0~100 클램프 적용 완료 값 */
  regionExploredPct: number;
  /** 최근 수집 목록 — 최신순, 상한 없이 전체 (AC 14, 추정 A6) */
  recentCells: CollectedCell[];
  /** 지도 게시용 오버레이 — 격자당 1개, 한 변 500m mock 상수 (AC 9·10) */
  overlayCells: CellOverlay[];
}

/**
 * 도감 조회 데이터 → 화면 뷰 모델. [AC 7·14·17]
 * 수집 0건 입력이면 통계 0·빈 목록·오버레이 0개가 그대로 파생된다 —
 * 통계는 요약(서버 표시값)을 전달할 뿐 목록 길이로 재계산하지 않는다.
 */
export const deriveDexView = ({ summary, collectedCells }: DexData): DexView => ({
  nickname: summary.nickname,
  avatarSrc: summary.avatarSrc,
  totalLabel: summary.totalLabel,
  totalExploredPct: clampPct(summary.totalExploredPct),
  streakDays: summary.streakDays,
  collectedCellCount: summary.collectedCellCount,
  badgeCount: summary.badgeCount,
  regionName: summary.regionName,
  regionExploredPct: clampPct(summary.regionExploredPct),
  recentCells: sortByCollectedAtDesc(collectedCells),
  overlayCells: collectedCells.map((cell) => ({
    id: cell.cellId,
    bounds: cellToBounds(cell.center, CELL_SIDE_METERS),
  })),
});
