import { useInfiniteQuery } from "@tanstack/react-query";
import type { Bounds } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { getOccupiedInViewportInfiniteOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  ApiResponseDtoOccupiedGridPageResponseDto,
  OccupiedGridResponseDto,
} from "@/shared/api/generated";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { mapQueryPolicy } from "./map-query-policy";
import { viewportQueryArgs } from "./viewport-query";

/**
 * 뷰포트 내 내 점령 격자 조회 (MSG-325 기준 4·9).
 * 지도 SDK를 import하지 않는다 — 뷰포트는 플랫폼 중립 `Bounds`로 받는다(RN 경계).
 */

/**
 * 한 뷰포트에서 이어받을 최대 페이지 수. `size` 기본이 1000이라 실사용 뷰포트는
 * 대개 1페이지이고, 이 상한은 커서가 끝나지 않는 경우의 안전장치다.
 */
export const MAX_GRID_PAGES = 5;

type GridPage = ApiResponseDtoOccupiedGridPageResponseDto;

/** 다음 페이지 커서 — 마지막 페이지(null)이거나 상한 도달이면 중단한다 */
export const nextGridsPageParam = (
  lastPage: GridPage,
  allPages: GridPage[],
): string | undefined => {
  if (allPages.length >= MAX_GRID_PAGES) return undefined;
  return unwrapEnvelope(lastPage).nextCursor ?? undefined;
};

/** 수집한 페이지들을 응답 순서대로 이어붙인 단일 격자 목록 */
export const flattenGridPages = (
  pages: GridPage[] | undefined,
): OccupiedGridResponseDto[] =>
  (pages ?? []).flatMap((page) => unwrapEnvelope(page).grids);

/**
 * 뷰포트 점령 격자 훅 — bounds가 없거나 명세 span 상한을 넘으면 요청하지 않는다.
 * 비로그인도 요청하지 않는다 (MSG-328 사용자 버그 리포트) — 보호 API(익명 401 실측)라
 * 게이트 없이는 홈 (재)마운트마다 401 + auth-pipeline reissue가 재발사된다.
 * 반환 데이터는 평탄화된 격자 목록이고, 로딩·에러 상태는 호출부가 그대로 쓴다.
 */
export const useOccupiedGridsQuery = (bounds: Bounds | null) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { query: viewport, enabled } = viewportQueryArgs(bounds);
  const query = useInfiniteQuery({
    ...getOccupiedInViewportInfiniteOptions({ query: viewport }),
    // 첫 페이지는 **커서 없이** 요청한다. 생성 queryFn은 pageParam이 문자열이면 `cursor`
    // 쿼리로 싣는데, 빈 문자열이면 `cursor=`가 그대로 나가 서버가 400으로 거부한다
    // (브라우저 검증에서 실측). 객체 형태로 주면 커서 없이 뷰포트 파라미터만 나간다
    initialPageParam: { query: viewport },
    getNextPageParam: nextGridsPageParam,
    enabled: enabled && isAuthenticated,
    ...mapQueryPolicy,
  });

  return { ...query, grids: flattenGridPages(query.data?.pages) };
};
