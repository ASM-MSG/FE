import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getRegionGridsOptions } from "../../../shared/api/query-options";
import type { RegionExploreResponseDto } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../model/home-sheet-state";
import { entityQueryPolicy } from "../model/map-query-policy";

/**
 * 행정동 격자 카드 조회 (MSG-423 요구 1·5) — `GET /api/regions/{regionCode}/grids`.
 * 웹 `features/region/model/use-region-grids-query.ts` 이식 — 정렬·상한은 웹과 같은
 * 확정값(sort=LATEST·limit=20)이다. regionCode가 null이면(행정동 밖·역지오코딩 미도착·
 * 비로그인) 조회하지 않는다.
 * entityQueryPolicy(keepPreviousData 없음) — 동이 바뀌면 이전 동 카드가 남으면 안 된다.
 */

/** 격자 카드 리스트 상한 — 웹과 동일(세로 스크롤 리스트 20장) */
export const REGION_GRIDS_LIMIT = 20;

export interface RegionGridsResult extends GatedQueryStatus {
  /** 격자 카드 리스트 + 헤더 카운트 — 미도착이면 undefined */
  data: RegionExploreResponseDto | undefined;
}

export const useRegionGridsQuery = (
  regionCode: string | null,
): RegionGridsResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const active = regionCode !== null && isAuthenticated;
  // 여기는 인증 축만 본다 — `regionCode`가 null인 두 경우를 이 훅은 구분할 수 없지만,
  // 역지오코딩 미도착이면 그 훅 자신이 미도착이라 시트 전체가 이미 로딩이고, 도착 후에도
  // null이면 행정동 밖(바다 등)이 확정된 것이라 빈 상태가 옳다 (PR #72 리뷰)
  const settled = hydrated;

  const query = useQuery({
    ...getRegionGridsOptions({
      path: { regionCode: regionCode ?? "" },
      query: { sort: "LATEST", limit: REGION_GRIDS_LIMIT },
    }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });

  return { data: query.data, ...gatedQueryStatus(query, active, settled) };
};
