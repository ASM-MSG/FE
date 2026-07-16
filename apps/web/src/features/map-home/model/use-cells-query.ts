import { queryOptions, useQuery } from "@tanstack/react-query";
import { MOCK_CELLS, type Cell } from "@/entities/cell";

/**
 * 격자 목록 조회 queryFn. [L7]
 * 현재는 mock 소스를 반환한다 — 실 API 전환 시 이 함수 내부(fetch/axios 호출)만 교체하면 되고,
 * queryKey와 반환 타입(Cell[])은 그대로 유지된다.
 */
export const fetchCells = async (): Promise<Cell[]> => MOCK_CELLS;

/** API 교체와 무관한 고정 쿼리 옵션 (queryKey: ["cells"], 반환 타입: Cell[]) */
export const cellsQueryOptions = () =>
  queryOptions({
    queryKey: ["cells"] as const,
    queryFn: fetchCells,
  });

/** 격자 목록 조회 훅 — 뷰는 이 훅으로 로딩/에러/데이터 상태를 받는다 */
export const useCellsQuery = () => useQuery(cellsQueryOptions());
