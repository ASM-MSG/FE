import {
  useMutation,
  useQueryClient,
  type MutationKey,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { guardMutate } from "../../video-actions/api/video-mutations";
import {
  blockUserMutationOptions,
  unblockUserMutationOptions,
  USER_BLOCK_MUTATION_KEYS,
} from "./user-block-mutations";

/**
 * 사용자 차단·해제 훅 (MSG-570 기준 8) — 옵션 팩토리(`user-block-mutations`)에 QueryClient를
 * 물리는 얇은 층. `mutate`에 in-flight 가드(`guardMutate`, video-actions 선례)를 씌우고
 * `mutateAsync`를 감춘다 — 같은 키의 요청이 진행 중이면 재발사가 무시된다.
 * 콜백은 훅 레벨 옵션 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다(MSG-325).
 */

/** 가드 래핑 공통부 — 두 훅이 같은 형태라 여기서 한 번만 (제네릭이라 입력 타입이 넓어지지 않는다) */
const useGuardedMutation = <TData, TVariables>(
  mutationKey: MutationKey,
  build: (
    queryClient: QueryClient,
  ) => UseMutationOptions<TData, Error, TVariables>,
) => {
  const queryClient = useQueryClient();
  const mutation = useMutation(build(queryClient));
  const { mutateAsync, ...guarded } = mutation;
  void mutateAsync;
  return {
    ...guarded,
    mutate: guardMutate(queryClient, mutationKey, mutation.mutate),
  };
};

export const useBlockUser = (callbacks?: {
  onBlocked?: (userId: number) => void;
  onError?: () => void;
}) =>
  useGuardedMutation(USER_BLOCK_MUTATION_KEYS.block, (queryClient) =>
    blockUserMutationOptions({
      queryClient,
      onBlocked: callbacks?.onBlocked,
      onError: callbacks?.onError,
    }),
  );

export const useUnblockUser = (callbacks?: { onError?: () => void }) =>
  useGuardedMutation(USER_BLOCK_MUTATION_KEYS.unblock, (queryClient) =>
    unblockUserMutationOptions({ queryClient, onError: callbacks?.onError }),
  );
