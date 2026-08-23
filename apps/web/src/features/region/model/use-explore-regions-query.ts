import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { gatedQueryStatus } from "./gated-query-status";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getExploreRegionsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { RegionGridCountResponseDto } from "@/shared/api/generated/types.gen";

export interface ExploreRegionsResult {
  /** 전체 지역 리스트(행정동명·격자 수) — 미도착이면 undefined */
  regions: RegionGridCountResponseDto[] | undefined;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * 전체 지역 리스트 조회 (MSG-328 AC 10) — `GET /api/regions/explore`.
 * 보호 API(익명 401 실측) 게이트를 훅이 소유한다 — 비로그인이면 조회하지 않는다
 * (grids·hotzones 게이트와 동일 패턴, PR 리뷰: 호출부 enabled 파라미터는 항상 true라
 * 죽은 파라미터 + 재사용 시 비로그인 조회 함정이라 제거). 마운트 자체가 "전체 보기"
 * 모드에서만 일어나므로(RegionListView) 별도 활성 조건은 없다.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 응답이 배열에서 커서 페이지(`items`·`hasNext`·`nextCursor`)로 바뀌어(MSG-460 서버 레인)
 * 첫 페이지 20개만 꺼낸다 — 다음 페이지 이어받기는 MSG-463 몫이다.
 */
export const useExploreRegionsQuery = (): ExploreRegionsResult => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    ...getExploreRegionsOptions(),
    select: (response) => unwrapEnvelope(response).items,
    enabled: isAuthenticated,
  });

  return { regions: query.data, ...gatedQueryStatus(query, isAuthenticated) };
};
