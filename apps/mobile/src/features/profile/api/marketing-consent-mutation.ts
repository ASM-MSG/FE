import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import {
  getConsentStatusQueryKey,
  updateMarketingConsentMutation,
} from "../../../shared/api/query-options";
import type { ApiResponseDtoConsentStatusResponseDto } from "../../../shared/api/sdk";

/**
 * 마케팅 수신 동의 저장 (MSG-448 기준 11·12·13) — `PUT /api/users/me/marketing-consent`.
 *
 * 위치 동의(`use-update-location-consent`)와 **다른 엔드포인트**다: 그쪽은 철회 불가한
 * 필수 동의를 켜기만 하고 `getMe`를 무효화하지만, 마케팅은 true·false 양방향이 유효하고
 * 응답이 동의 상태(`ConsentStatusResponseDto`) 전체라 조회 캐시에 직접 seed할 수 있다.
 *
 * 구조는 MSG-426의 "옵션 팩토리 + 얇은 훅" 2파일을 따른다 — 훅 본체를 테스트하려면
 * `auth-session`(expo-secure-store)이 딸려 와 파싱 단계에서 죽으므로, 테스트는 이 옵션
 * 객체를 `MutationObserver`로 직접 구동한다.
 *
 * - `onMutate`: 캐시에 낙관 반영 + 이전 봉투 스냅숏 — 응답 전에 스위치가 전환된다
 * - `onSuccess`: 응답 봉투를 `setQueryData`로 남긴다 — invalidate/refetch 금지
 *   (기준 11, MSG-426 알림 토글·MSG-431 공개범위 전환이 세운 정책)
 * - `onError`: 스냅숏 복원 (기준 12). 실패 캡션은 `resolveMarketingErrorText`가 만든다
 * - 연타 가드는 `mutationKey` in-flight 조회로 판정한다 (기준 13) — `isPending`은 React
 *   상태라 같은 tick의 재탭을 못 막는다
 */

/** 조회·저장이 공유하는 캐시 원본 형태 — 봉투 그대로 (select에서만 언랩한다) */
export type ConsentEnvelope = ApiResponseDtoConsentStatusResponseDto;

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
// (웹 use-profile-mutations·use-update-location-consent 선례)
const updateMarketingConsentFn = updateMarketingConsentMutation().mutationFn!;

/** in-flight 판정용 키 — 연타 가드가 이 키로 진행 중 뮤테이션을 센다 */
const MARKETING_CONSENT_MUTATION_KEY = ["users", "marketing-consent"];

interface MarketingToggleContext {
  previous: ConsentEnvelope | undefined;
}

export const marketingConsentMutationOptions = (
  queryClient: QueryClient,
): UseMutationOptions<
  ConsentEnvelope,
  Error,
  boolean,
  MarketingToggleContext
> => {
  const queryKey = getConsentStatusQueryKey();
  return {
    mutationKey: MARKETING_CONSENT_MUTATION_KEY,
    mutationFn: (consented, context) =>
      updateMarketingConsentFn({ body: { consented } }, context),
    onMutate: (consented) => {
      const previous = queryClient.getQueryData<ConsentEnvelope>(queryKey);
      if (previous !== undefined) {
        queryClient.setQueryData<ConsentEnvelope>(queryKey, {
          ...previous,
          data: { ...previous.data, marketing: consented },
        });
      }
      return { previous };
    },
    onSuccess: (envelope) => {
      queryClient.setQueryData<ConsentEnvelope>(queryKey, envelope);
    },
    onError: (_error, _consented, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<ConsentEnvelope>(queryKey, context.previous);
      }
    },
  };
};

/** 저장이 왕복 중인가 — 연타 가드의 판정 (기준 13) */
export const isMarketingTogglePending = (queryClient: QueryClient): boolean =>
  queryClient.isMutating({ mutationKey: MARKETING_CONSENT_MUTATION_KEY }) > 0;

/**
 * 연타 가드가 걸린 토글 트리거를 만든다 (기준 13) — 진행 중이면 새 요청을 만들지 않는다.
 * 훅 밖으로 뺀 이유는 이 가드가 기준 13 그 자체라 테스트가 직접 구동해야 하기 때문이다.
 */
export const createMarketingToggle =
  (queryClient: QueryClient, mutate: (consented: boolean) => void) =>
  (consented: boolean): void => {
    if (isMarketingTogglePending(queryClient)) return;
    mutate(consented);
  };
