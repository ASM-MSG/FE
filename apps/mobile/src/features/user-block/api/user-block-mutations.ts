import type {
  MutationKey,
  QueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import {
  blockMutation,
  getBlockedUsersQueryKey,
  unblockMutation,
} from "../../../shared/api/query-options";
import type { ApiResponseDtoListBlockedUserResponseDto } from "../../../shared/api/sdk";
import { removeBlockedUser } from "../model/user-block";
import { invalidateAfterBlockChange } from "./invalidate-blocked-content";

/**
 * 사용자 차단·해제 mutation 옵션 (MSG-570 기준 4·6·7·14·15) — "옵션 팩토리 + 얇은 훅"
 * (MSG-426 관례). 테스트는 이 객체를 `MutationObserver`로 직접 구동한다.
 * 얇은 훅은 `use-user-block-mutations.ts`가 소유한다.
 */

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const blockFn = blockMutation().mutationFn!;
const unblockFn = unblockMutation().mutationFn!;

/** in-flight 판정용 키 — `guardMutate`가 이 키로 진행 중 mutation을 센다 (기준 8) */
export const USER_BLOCK_MUTATION_KEYS = {
  block: ["user-block", "block"],
  unblock: ["user-block", "unblock"],
} as const satisfies Record<string, MutationKey>;

export interface UserBlockInput {
  userId: number;
}

/**
 * 차단 (기준 4·6·7) — `POST /api/users/{userId}/block`. 성공 시 콘텐츠 목록과 차단 목록을 무효화하고
 * 완료 콜백을 부른다. 실패 시 아무것도 무효화하지 않아 다이얼로그가 열린 채 재시도할 수 있다.
 */
export const blockUserMutationOptions = ({
  queryClient,
  onBlocked,
  onError,
}: {
  queryClient: QueryClient;
  /** 성공 콜백은 **제출한** userId를 받는다 — 호출부가 다이얼로그 상태(닫힘·다른 대상)에 기대지 않게 */
  onBlocked?: (userId: number) => void;
  onError?: () => void;
}): UseMutationOptions<
  Awaited<ReturnType<typeof blockFn>>,
  Error,
  UserBlockInput
> => ({
  mutationKey: USER_BLOCK_MUTATION_KEYS.block,
  mutationFn: (input, context) =>
    blockFn({ path: { userId: input.userId } }, context),
  onSuccess: (_data, variables) => {
    invalidateAfterBlockChange(queryClient);
    // 차단 목록은 seed하지 않는다(blockedAt·프로필 이미지는 서버만 안다) — 30초 stale 창 안에
    // 목록 화면으로 돌아와도 새 행이 보이도록 무효화 (codex 리뷰 P2)
    void queryClient.invalidateQueries({ queryKey: getBlockedUsersQueryKey() });
    onBlocked?.(variables.userId);
  },
  onError: () => onError?.(),
});

/**
 * 해제 (기준 14·15) — `DELETE /api/users/{userId}/block`. 성공 시 차단 목록 캐시에서 그 행을
 * seed로 제거하고(재조회 없음 — 목록은 최신순 단순 배열이라 로컬 필터가 정본과 같다)
 * 콘텐츠 목록을 무효화한다. 실패 시 행이 남는다.
 */
export const unblockUserMutationOptions = ({
  queryClient,
  onError,
}: {
  queryClient: QueryClient;
  onError?: () => void;
}): UseMutationOptions<
  Awaited<ReturnType<typeof unblockFn>>,
  Error,
  UserBlockInput
> => ({
  mutationKey: USER_BLOCK_MUTATION_KEYS.unblock,
  mutationFn: (input, context) =>
    unblockFn({ path: { userId: input.userId } }, context),
  onSuccess: (_data, { userId }) => {
    queryClient.setQueryData<ApiResponseDtoListBlockedUserResponseDto>(
      getBlockedUsersQueryKey(),
      (previous) =>
        previous === undefined
          ? previous
          : { ...previous, data: removeBlockedUser(previous.data, userId) },
    );
    invalidateAfterBlockChange(queryClient);
  },
  onError: () => onError?.(),
});
