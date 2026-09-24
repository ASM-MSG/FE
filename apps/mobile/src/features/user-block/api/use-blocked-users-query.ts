import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getBlockedUsersOptions } from "../../../shared/api/query-options";
import type { BlockedUserResponseDto } from "../../../shared/api/sdk";

/**
 * 차단한 사용자 목록 (MSG-570 기준 13) — `GET /api/users/me/blocks`, 서버 최신순·페이지 없음.
 * 반환 형태는 report-history 훅과 동형이라 화면이 같은 4상태 스위치(`resolveBlockListState`)를 탄다.
 * 해제 성공은 뮤테이션이 이 캐시를 seed로 갱신한다 — 여기서 재조회하지 않는다.
 */
export interface BlockedUsersQueryResult {
  items: readonly BlockedUserResponseDto[];
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

/** 참조가 매번 바뀌지 않도록 모듈 상수로 고정 */
const NO_ITEMS: readonly BlockedUserResponseDto[] = [];

export const useBlockedUsersQuery = (): BlockedUsersQueryResult => {
  const query = useQuery({
    ...getBlockedUsersOptions(),
    select: unwrapEnvelope,
  });

  return {
    items: query.data ?? NO_ITEMS,
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
};
