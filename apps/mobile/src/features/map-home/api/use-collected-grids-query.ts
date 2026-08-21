import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getCollectionGridsOptions } from "../../../shared/api/query-options";
import type { CollectionGridResponseDto } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../model/home-sheet-state";
import { entityQueryPolicy } from "../model/map-query-policy";

/**
 * 내 수집 격자 조회 (MSG-427 C6) — `GET /api/collections/grids`.
 * 웹 `use-collected-grids-query.ts` 이식. 지도 SDK를 import하지 않는다.
 *
 * 격자 상세의 "…부터 내가 점령 중" 문구 근거(`firstCollectedAt`)다. 보호 API라 비로그인은
 * 조회하지 않는다 — 게이트 없이는 홈 (재)마운트마다 401 + reissue가 재발사된다.
 */
export interface CollectedGridsResult extends GatedQueryStatus {
  /** 원본 목록 — 점령 시작일 등 격자별 부가 정보 조회용 */
  grids: CollectionGridResponseDto[];
}

const EMPTY_GRIDS: CollectionGridResponseDto[] = [];

export const useCollectedGridsQuery = (): CollectedGridsResult => {
  const { isAuthenticated, hydrated } = useAuth();

  const query = useQuery({
    ...getCollectionGridsOptions(),
    select: unwrapEnvelope,
    enabled: isAuthenticated,
    ...entityQueryPolicy,
  });

  return {
    grids: query.data ?? EMPTY_GRIDS,
    ...gatedQueryStatus(query, isAuthenticated, hydrated),
  };
};
