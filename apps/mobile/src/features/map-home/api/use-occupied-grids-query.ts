import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Bounds } from "../../../entities/cell/model/grid";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getOccupiedInViewportInfiniteOptions } from "../../../shared/api/query-options";
import type {
  ApiResponseDtoOccupiedGridPageResponseDto,
  OccupiedGridResponseDto,
} from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../model/home-sheet-state";
import { mapQueryPolicy } from "../model/map-query-policy";
import { viewportQueryArgs } from "../model/viewport-query";

/**
 * 뷰포트 내 내 점령 격자 조회 (MSG-423 요구 5) — `GET /api/grids`.
 * 웹 `features/map-home/model/use-occupied-grids-query.ts` 이식 — 같은 생성 SDK·같은
 * 쿼리키를 쓰고, 새 fetch·새 QueryClient를 만들지 않는다 (MSG-419 산출물 재사용).
 * 지도 SDK를 import하지 않는다 — 뷰포트는 플랫폼 중립 `Bounds`로 받는다.
 */

/**
 * 한 뷰포트에서 이어받을 최대 페이지 수. `size` 기본이 1000이라 실사용 뷰포트는
 * 대개 1페이지이고, 이 상한은 커서가 끝나지 않는 경우의 안전장치다.
 */
export const MAX_GRID_PAGES = 5;

type GridPage = ApiResponseDtoOccupiedGridPageResponseDto;

/** 다음 페이지 커서 — 마지막 페이지(null)이거나 상한 도달이면 중단한다 */
const nextGridsPageParam = (
  lastPage: GridPage,
  allPages: GridPage[],
): string | undefined => {
  if (allPages.length >= MAX_GRID_PAGES) return undefined;
  return unwrapEnvelope(lastPage).nextCursor ?? undefined;
};

export interface OccupiedGridsResult extends GatedQueryStatus {
  /** 수집한 페이지들을 응답 순서대로 이어붙인 격자 목록 — 미도착이면 빈 배열 */
  grids: OccupiedGridResponseDto[];
}

export const useOccupiedGridsQuery = (
  bounds: Bounds | null,
): OccupiedGridsResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const { query: viewport, enabled } = viewportQueryArgs(bounds);
  const active = enabled && isAuthenticated;
  // 게이트 판정이 확정됐는가 — 재수화 전(로그인 여부 미상)이나 지도 뷰포트 미확정에는
  // "조회 안 함"이 아니라 "아직 모름"이므로 접지 않는다 (PR #72 리뷰)
  const settled = hydrated && bounds !== null;

  const query = useInfiniteQuery({
    ...getOccupiedInViewportInfiniteOptions({ query: viewport }),
    // 첫 페이지는 **커서 없이** 요청한다. 생성 queryFn은 pageParam이 문자열이면 `cursor`
    // 쿼리로 싣는데, 빈 문자열이면 `cursor=`가 그대로 나가 서버가 400으로 거부한다
    // (웹 브라우저 검증 실측 — 스펙 리스크 R6). 객체 형태로 주면 뷰포트 파라미터만 나간다
    initialPageParam: { query: viewport },
    getNextPageParam: nextGridsPageParam,
    enabled: active,
    ...mapQueryPolicy,
  });

  // 페이지가 그대로면 같은 배열 참조를 유지한다 — 화면의 좌표 정규화(proj4)가
  // 매 렌더 다시 돌지 않도록 하는 것이 목적이다
  const grids = useMemo(
    () =>
      (query.data?.pages ?? []).flatMap((page) => unwrapEnvelope(page).grids),
    [query.data?.pages],
  );

  return { grids, ...gatedQueryStatus(query, active, settled) };
};
