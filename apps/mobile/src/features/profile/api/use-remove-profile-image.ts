import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  getMeQueryKey,
  removeProfileImageMutation,
} from "../../../shared/api/query-options";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const removeProfileImageFn = removeProfileImageMutation().mutationFn!;

/** 낙관 기록이 손대는 필드만 좁힌 getMe 봉투 — 나머지 필드는 스프레드로 보존된다 */
type MeEnvelopeSnapshot = { data: { profileImageUrl: string | null } };

/**
 * 프로필 이미지 삭제 mutation 옵션 (기준 15) — `DELETE /api/users/me/profile-image`.
 * 성공하면 캐시의 `profileImageUrl`을 즉시 null로 기록한 뒤 getMe를 무효화한다.
 * 무효화만 걸던 웹 미러는 **재조회가 실패하면 서버에서 지워진 사진이 화면에 남는** 창이 있다
 * (codex 리뷰) — 낙관 기록이 그 창을 닫고, 뒤따르는 무효화가 나머지 필드를 정본으로 맞춘다
 * (MSG-409가 세운 "성공 응답을 캐시에 직접 기록" 정책과 같은 방향).
 * 실패하면 아무것도 건드리지 않아 화면이 이전 이미지를 유지한다.
 * 옵션 팩토리로 분리한 이유는 RN 렌더 테스트가 없어 테스트가 `MutationObserver`로
 * 이 객체를 직접 구동하기 때문이다.
 */
export const removeProfileImageMutationOptions = (
  queryClient: QueryClient,
): UseMutationOptions<
  Awaited<ReturnType<typeof removeProfileImageFn>>,
  Error,
  void
> => ({
  mutationFn: (_variables, context) => removeProfileImageFn({}, context),
  onSuccess: () => {
    // 생성 쿼리 키는 데이터 타입을 싣지 않아(`{}`) 봉투를 여기서 좁힌다.
    // 스프레드가 나머지 필드를 런타임에 그대로 보존한다
    queryClient.setQueryData<MeEnvelopeSnapshot>(getMeQueryKey(), (previous) =>
      previous == null
        ? previous
        : {
            ...previous,
            data: { ...previous.data, profileImageUrl: null },
          },
    );
    void queryClient.invalidateQueries({ queryKey: getMeQueryKey() });
  },
});

/** 화면이 쓰는 삭제 훅 — [저장] 시점에만 발사된다 (삭제 예약 패턴, 기준 15) */
export const useRemoveProfileImage = () => {
  const queryClient = useQueryClient();
  return useMutation(removeProfileImageMutationOptions(queryClient));
};
