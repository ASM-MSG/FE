import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  getMeQueryKey,
  updateNicknameMutation,
} from "../../../shared/api/query-options";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const updateNicknameFn = updateNicknameMutation().mutationFn!;

/**
 * 닉네임 수정 (결정 E2-b) — `PUT /api/users/me/nickname`.
 * 프로필 카드 표시가 서버값(getMe)으로 바뀐 이상 저장도 서버를 거쳐야 한다 — 안 그러면
 * 저장한 닉네임이 화면에 반영되지 않는 모순이 생긴다. 생성 SDK에 대응 함수가 이미 있어
 * (`updateNickname`) 배선만 한다.
 * 성공 시 getMe invalidate로 프로필 카드가 갱신되고 `onSaved`(화면 복귀)가 불린다.
 * 실패 시 onSaved가 불리지 않아 편집 화면이 유지되고 재시도할 수 있다.
 * 콜백은 훅 레벨 옵션이다 — per-call 콜백은 화면 이탈 시 유실된다 (웹 MSG-325 선례).
 */
export const updateNicknameMutationOptions = (
  queryClient: QueryClient,
  callbacks: { onSaved: () => void },
): UseMutationOptions<
  Awaited<ReturnType<typeof updateNicknameFn>>,
  Error,
  string
> => ({
  mutationFn: (nickname, context) =>
    updateNicknameFn({ body: { nickname } }, context),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
    callbacks.onSaved();
  },
});

/** 화면이 쓰는 닉네임 저장 훅 — 성공 시에만 `onSaved`(화면 복귀)가 불린다 */
export const useUpdateNickname = (callbacks: { onSaved: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation(updateNicknameMutationOptions(queryClient, callbacks));
};
