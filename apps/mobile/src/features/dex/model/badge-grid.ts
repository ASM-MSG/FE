/**
 * 뱃지 그리드 행 분할 (MSG-301 AC 2) — NativeWind에서 3열 균등 그리드를
 * 임의값 폭 없이(토큰 규칙) 만들려면 행 단위 flex-row gap + flex-1 셀이
 * 필요해, 뷰가 아닌 순수 함수로 행을 나눈다 (스펙 구현 계획 근거).
 */

/** 뱃지 그리드 열 수 — 시안 3열 고정 */
export const BADGE_GRID_COLUMNS = 3;

/** 목록을 size개씩 행으로 분할 — 순서 보존, 마지막 행은 나머지 (7개 → [3, 3, 1]) */
export const chunkIntoRows = <T>(items: readonly T[], size: number): T[][] => {
  const rows: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    rows.push(items.slice(start, start + size));
  }
  return rows;
};
