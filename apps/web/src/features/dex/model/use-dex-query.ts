import { queryOptions, useQuery } from "@tanstack/react-query";
import { MOCK_DEX, type DexData } from "@/entities/dex";

/**
 * 도감 조회 queryFn. [AC 19]
 * 현재는 mock 소스를 반환한다 — 실 API 전환 시 이 함수 내부(fetch/axios 호출)만 교체하면 되고,
 * queryKey와 반환 타입(DexData)은 그대로 유지된다 (use-cells-query 패턴).
 */
export const fetchDex = async (): Promise<DexData> => MOCK_DEX;

/** API 교체와 무관한 고정 쿼리 옵션 (queryKey: ["dex"], 반환 타입: DexData) */
export const dexQueryOptions = () =>
  queryOptions({
    queryKey: ["dex"] as const,
    queryFn: fetchDex,
  });

/** 도감 조회 훅 — 뷰는 이 훅으로 로딩/에러/데이터 상태를 받는다 */
export const useDexQuery = () => useQuery(dexQueryOptions());
