import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import type { CollectionGridResponseDto } from "@/shared/api/generated";
import { getCollectionGridsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { entityQueryPolicy } from "./map-query-policy";

/**
 * 내 수집 격자 조회 (MSG-395 AC 3·11·28) — `GET /api/collections/grids`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 격자 상세의 "…부터 내가 점령 중" 문구 근거(`firstCollectedAt`)다. 보호 API라 비로그인은
 * 조회하지 않는다 — 게이트 없이는 홈 (재)마운트마다 401 + reissue가 재발사된다.
 *
 * MSG-403: 미션 진행도 계산 입력(중심 좌표 목록)이던 `collected`는 사라졌다 —
 * 진행도를 서버가 주면서 좌표 변환이 필요 없어졌다.
 */
export interface CollectedGridsResult {
  /** 원본 목록 — 점령 시작일 등 격자별 부가 정보 조회용 */
  grids: CollectionGridResponseDto[];
  /** 조회 실패 — "수집 격자 0개"와 구분해야 재시도 수단을 줄 수 있다 */
  isError: boolean;
  retry: () => void;
}

const EMPTY_GRIDS: CollectionGridResponseDto[] = [];

export const useCollectedGridsQuery = (): CollectedGridsResult => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data, isError, refetch } = useQuery({
    ...getCollectionGridsOptions(),
    select: unwrapEnvelope,
    enabled: isAuthenticated,
    ...entityQueryPolicy,
  });

  return useMemo(() => {
    const grids = data ?? EMPTY_GRIDS;
    return {
      grids,
      isError,
      retry: () => void refetch(),
    };
  }, [data, isError, refetch]);
};
