import type { Cell } from "@/entities/cell";

/** 탐색 패널 정렬 순서 — 인기순(videoCount) / 최신순(createdAt) */
export type SortOrder = "popular" | "recent";

/** 탐색 파생 셀렉터 입력 */
export interface ExploreQuery {
  query: string;
  order: SortOrder;
}

/**
 * 검색어를 label(동네명+코드)의 부분 문자열로 매칭한다(대소문자 무시). [L1]
 * 빈/공백 검색어는 입력 목록을 그대로 반환한다 — 검색은 결과 "집합"만 결정한다.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 */
export const searchCells = (cells: Cell[], query: string): Cell[] => {
  const q = query.trim().toLowerCase();
  if (!q) return cells;
  return cells.filter((cell) => cell.label.toLowerCase().includes(q));
};

/**
 * 정렬한다 — 검색은 "순서"만 결정한다. 원본 배열은 변형하지 않는다. [L2]
 * - `"popular"`: videoCount 내림차순, 동률 시 id 오름차순 안정 정렬
 * - `"recent"`: createdAt 내림차순(최신 우선), 동률 시 id 오름차순 안정 정렬
 */
export const sortCells = (cells: Cell[], order: SortOrder): Cell[] =>
  [...cells].sort((a, b) =>
    order === "popular"
      ? b.videoCount - a.videoCount || a.id.localeCompare(b.id)
      : b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  );

/**
 * 영상 길이(초)를 `m:ss`로 포맷한다(24→"0:24", 84→"1:24", 605→"10:05"). [L3]
 * 값이 `undefined`이면 null을 반환한다 — 배지 미표시 신호(S6).
 */
export const formatDuration = (sec?: number): string | null => {
  if (sec === undefined) return null;
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * 검색 → 정렬 파이프라인. [L4]
 * 정렬 상태를 바꿔도 동일 검색어의 결과 집합(원소)은 동일하다 —
 * 검색은 집합만, 정렬은 순서만 결정한다.
 */
export const selectExploreCells = (
  cells: Cell[],
  { query, order }: ExploreQuery,
): Cell[] => sortCells(searchCells(cells, query), order);
