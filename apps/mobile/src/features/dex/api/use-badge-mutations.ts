import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  findMyBadgesQueryKey,
  replaceFeaturedMutation,
} from "../../../shared/api/query-options";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const replaceFeaturedFn = replaceFeaturedMutation().mutationFn!;

/**
 * 대표 뱃지 집합 교체 (S6·S7) — `PUT /api/badges/featured`. 웹
 * `features/dex/api/use-badge-mutations.ts` 미러.
 * badgeIds는 랭크 순서(배열 순서 = 표시 순서), 빈 배열은 전부 해제다.
 * 성공 시 findMyBadges invalidate — 진열장이 새 featuredRank 순(orderBadges)으로
 * 재정렬된다(PUT 응답 write-through 대신 재조회 — 단순·정합 우선).
 * `onSaved`는 성공에만 불린다 — 실패 시 편집 모드·선택이 유지되고 재시도할 수 있다 (S7).
 * 콜백은 훅 레벨 옵션이다 — per-call 콜백은 화면 이탈 시 유실된다 (웹 MSG-325 선례).
 *
 * 옵션 팩토리로 분리한 이유는 RN 렌더 테스트가 없어 테스트가 `MutationObserver`로
 * 이 객체를 직접 구동하기 때문이다 (use-remove-profile-image 선례).
 */
export const replaceFeaturedMutationOptions = (
  queryClient: QueryClient,
  callbacks: { onSaved: () => void },
): UseMutationOptions<
  Awaited<ReturnType<typeof replaceFeaturedFn>>,
  Error,
  number[]
> => ({
  mutationFn: (badgeIds, context) =>
    replaceFeaturedFn({ body: { badgeIds } }, context),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: findMyBadgesQueryKey() });
    callbacks.onSaved();
  },
});

/**
 * 화면이 쓰는 대표 뱃지 저장 훅 — `mutate`에 in-flight 가드를 씌워 pending 중 재탭을
 * 무시한다 (S6). `mutateAsync`는 노출하지 않는다 — 가드를 우회하는 무가드 발사 경로가 된다.
 */
export const useReplaceFeaturedBadges = (callbacks: {
  onSaved: () => void;
}) => {
  const queryClient = useQueryClient();
  const mutation = useMutation(
    replaceFeaturedMutationOptions(queryClient, callbacks),
  );

  const mutate = (badgeIds: number[]): void => {
    if (mutation.isPending) return; // 중복 PUT 차단 (S6)
    mutation.mutate(badgeIds);
  };

  const { mutateAsync, ...guarded } = mutation;
  void mutateAsync;
  return { ...guarded, mutate };
};
