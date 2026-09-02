import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getSubmissionsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  AdminEventSubmissionItemResponseDto,
  EventSubmissionStatusCountsResponseDto,
} from "@/shared/api/generated/types.gen";
import type { SubmissionStatus } from "../model/submission-view";

/**
 * 심사 큐 페이지 크기 (추정 4) — 서버 최대치로 단일 페이지를 받는다.
 * 페이지네이션은 티켓·Figma 모두 없어 미구현이고, 상태당 100건 초과 대응은 후속 몫이다.
 */
export const SUBMISSIONS_PAGE_SIZE = 100;

/**
 * 관리자 심사 큐 목록 조회 (MSG-552 AC 3) — `GET /api/admin/event-submissions`.
 * status가 쿼리 키에 실려 탭을 바꾸면 재조회된다. 정렬은 서버 고정(접수 최신순)이라
 * FE 재정렬이 없다 (AC 6).
 *
 * `counts`는 필터와 무관한 상태별 전체 건수라 탭 뱃지 재료다. 탭 전환마다 뱃지가
 * 사라지지 않도록 `keepPreviousData`를 쓰고, 대신 직전 목록이 새 탭의 행으로 보이지
 * 않게 `isPlaceholder`를 함께 노출한다 (추정 9 — 목록 영역은 로딩 표시가 정본).
 */
export const useSubmissionsQuery = (
  status: SubmissionStatus,
): {
  submissions: AdminEventSubmissionItemResponseDto[];
  counts: EventSubmissionStatusCountsResponseDto | null;
  isPending: boolean;
  isPlaceholder: boolean;
  isError: boolean;
  retry: () => void;
} => {
  const query = useQuery({
    ...getSubmissionsOptions({
      query: { status, page: 0, size: SUBMISSIONS_PAGE_SIZE },
    }),
    select: unwrapEnvelope,
    placeholderData: keepPreviousData,
  });

  return {
    submissions: query.data?.submissions ?? [],
    counts: query.data?.counts ?? null,
    isPending: query.isPending,
    isPlaceholder: query.isPlaceholderData,
    isError: query.isError,
    retry: query.refetch,
  };
};
