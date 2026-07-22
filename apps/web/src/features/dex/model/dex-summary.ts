import type { CollectedCell, DexData } from "@/entities/dex";
import {
  CELL_SIDE_METERS,
  cellToBounds,
  type CellOverlay,
} from "./cell-overlay";

/**
 * 도감 화면 파생 로직 (AC 7·14·17·20·23, 2026-07-22 개정 반영).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 */

/** 탐험률을 0~100으로 클램프한다 — 음수·100 초과 입력 방어. [AC 7] */
export const clampPct = (value: number): number =>
  Math.min(100, Math.max(0, value));

/**
 * 전체 지도 기준 탐험 진행률 포맷 (개정 D1, A12 — Fog of World식 미소값). [AC 20]
 * - 0: "0%" (신규 사용자)
 * - 1% 미만: 유효숫자 2자리 ("0.012%")
 * - 1% 이상: 소수 첫째 자리, 정수면 정수 ("68%"·"1.2%")
 */
export const formatExploredPct = (value: number): string => {
  if (value === 0) return "0%";
  if (value < 1) return `${value.toPrecision(2)}%`;
  return `${Math.round(value * 10) / 10}%`;
};

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

/** 최근 수집 목록 상한 (개정 D3 — 티켓 명시값) */
export const RECENT_CELLS_LIMIT = 30;

/** 최근 수집 목록 파생 — 최신순 정렬 후 최대 30개. [AC 14 개정 D3] */
export const selectRecentCells = (cells: CollectedCell[]): CollectedCell[] =>
  sortByCollectedAtDesc(cells).slice(0, RECENT_CELLS_LIMIT);

/**
 * 표시 목록에서 X로 제거된 항목을 제외한다 (개정 D4). [AC 23]
 * 정렬·상한 파생 "이후"에 적용한다 — 상위 30에서 제거해도 31번째가 복귀하지 않는다.
 * 제거는 표시 전용 상태로, 통계·오버레이 파생(deriveDexView)은 이 결과를 입력받지 않는다.
 */
export const excludeRemoved = (
  cells: CollectedCell[],
  removedIds: string[],
): CollectedCell[] => cells.filter((c) => !removedIds.includes(c.cellId));

/** 도감 화면이 소비하는 파생 뷰 모델 — 요약(클램프 적용) + 최신순·상한 목록 + 오버레이 */
export interface DexView {
  nickname: string;
  avatarSrc?: string;
  /** 전체 지도 기준 진행률 — 0~100 클램프 적용 완료 값, 표시는 formatExploredPct (개정 D1) */
  totalExploredPct: number;
  streakDays: number;
  collectedCellCount: number;
  badgeCount: number;
  /** 지역별 탐험률 맵 패스스루 — 현재 지역 결정(current-region)이 소비 (개정 D2) */
  regionExploredPctMap: Record<string, number>;
  /** 최근 수집 목록 — 최신순 최대 30 (AC 14 개정 D3). X 제거 제외는 뷰에서 excludeRemoved로 */
  recentCells: CollectedCell[];
  /** 지도 게시용 오버레이 — 격자당 1개, 한 변 500m mock 상수 (AC 9·10). 제거 상태 미반영 (AC 24) */
  overlayCells: CellOverlay[];
}

/**
 * 도감 조회 데이터 → 화면 뷰 모델. [AC 7·14·17]
 * 수집 0건 입력이면 통계 0·빈 목록·오버레이 0개가 그대로 파생된다 —
 * 통계는 요약(서버 표시값)을 전달할 뿐 목록 길이로 재계산하지 않는다.
 * X 제거 상태(recent-removal-store)는 입력받지 않는다 — 통계·오버레이 불변 (AC 23·24).
 */
export const deriveDexView = ({
  summary,
  collectedCells,
  regionExploredPctMap,
}: DexData): DexView => ({
  nickname: summary.nickname,
  avatarSrc: summary.avatarSrc,
  totalExploredPct: clampPct(summary.totalExploredPct),
  streakDays: summary.streakDays,
  collectedCellCount: summary.collectedCellCount,
  badgeCount: summary.badgeCount,
  regionExploredPctMap,
  recentCells: selectRecentCells(collectedCells),
  overlayCells: collectedCells.map((cell) => ({
    id: cell.cellId,
    bounds: cellToBounds(cell.center, CELL_SIDE_METERS),
  })),
});
