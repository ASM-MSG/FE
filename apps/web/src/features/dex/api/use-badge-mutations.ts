import { useMutation, useQueryClient } from "@tanstack/react-query";
// 생성 mutation 옵션·키는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  findMyBadgesQueryKey,
  replaceFeaturedMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 뱃지 mutation 훅 (MSG-413 기준 6~9) — use-profile-mutations 패턴 미러
 * (생성 SDK mutation 옵션 기반, 직접 fetch/URL 하드코딩 없음).
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다(MSG-325 선례).
 */

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const replaceFeaturedFn = replaceFeaturedMutation().mutationFn!;

/**
 * 대표 뱃지 집합 교체 (기준 6·7) — `PUT /api/badges/featured`.
 * badgeIds는 랭크 순서(배열 순서 = 표시 순서), 빈 배열은 전부 해제.
 * 성공 시 findMyBadges invalidate — 진열장이 새 featuredRank 순(orderBadges)으로
 * 재정렬된다(PUT 응답 write-through 대신 재조회 — 단순·정합 우선, 스펙 리스크 결정).
 * onSaved는 성공에만 불린다 — 실패 시 편집모드·선택이 유지된다 (기준 8).
 * mutate는 in-flight 가드로 감싼다 — pending 중 재발사 무시 (기준 9,
 * useSetVideoVisibility 선례).
 */
export const useReplaceFeaturedBadges = (callbacks?: {
  onSaved?: () => void;
}) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (badgeIds: number[], context) =>
      replaceFeaturedFn({ body: { badgeIds } }, context),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: findMyBadgesQueryKey() });
      callbacks?.onSaved?.();
    },
  });

  const mutate = (badgeIds: number[]): void => {
    if (mutation.isPending) return; // in-flight 가드 — 중복 PUT 차단 (기준 9)
    mutation.mutate(badgeIds);
  };

  // mutateAsync는 노출하지 않는다 — 가드를 우회하는 무가드 발사 경로가 된다 (PR #62 선례)
  const { mutateAsync, ...guarded } = mutation;
  void mutateAsync;
  return { ...guarded, mutate };
};
