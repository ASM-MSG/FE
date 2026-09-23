import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  getOccurrenceDetailQueryKey,
  updateSubscriptionMutation,
} from "../../../shared/api/query-options";
import type {
  ApiResponseDtoEventNotificationResponseDto,
  ApiResponseDtoEventOccurrenceDetailResponseDto,
} from "../../../shared/api/sdk";
import { withNotificationOn } from "../model/event-subscription";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const updateSubscriptionFn = updateSubscriptionMutation().mutationFn!;

type DetailEnvelope = ApiResponseDtoEventOccurrenceDetailResponseDto;

const detailKey = (occurrenceId: number) =>
  getOccurrenceDetailQueryKey({ path: { occurrenceId } });

/** 상세 봉투의 notificationOn만 기록 — 캐시가 없으면(시트 열기 전) 아무것도 하지 않는다 */
const writeNotificationOn = (
  queryClient: QueryClient,
  occurrenceId: number,
  enabled: boolean,
) =>
  queryClient.setQueryData<DetailEnvelope>(
    detailKey(occurrenceId),
    (previous) =>
      previous === undefined
        ? previous
        : { ...previous, data: withNotificationOn(previous.data, enabled) },
  );

export interface EventSubscriptionVariables {
  occurrenceId: number;
  enabled: boolean;
}

/**
 * 행사 알림 구독 토글 (MSG-603 L3) — `PUT /api/event-occurrences/{id}/notification`.
 * 낙관: 상세 캐시 `notificationOn`을 즉시 바꾼다. 성공: 응답 `enabled`(노출 파생값 — 요청 사이에
 * 회차가 종료됐으면 false)를 기록. 실패: 직전 값으로 되돌린다. 토글 하나뿐이라 겹침은 같은 키
 * 덮어쓰기로 수렴한다(마지막 요청의 결과가 남는다).
 * 옵션 팩토리로 분리한 이유는 RN 렌더 테스트가 없어 테스트가 `MutationObserver`로 구동하기 때문.
 */
export const eventSubscriptionMutationOptions = (
  queryClient: QueryClient,
): UseMutationOptions<
  ApiResponseDtoEventNotificationResponseDto,
  Error,
  EventSubscriptionVariables,
  { previous: boolean | undefined }
> => ({
  mutationFn: async ({ occurrenceId, enabled }, context) => {
    const result = await updateSubscriptionFn(
      { path: { occurrenceId }, body: { enabled } },
      context,
    );
    return result as ApiResponseDtoEventNotificationResponseDto;
  },
  onMutate: async ({ occurrenceId, enabled }) => {
    await queryClient.cancelQueries({ queryKey: detailKey(occurrenceId) });
    const previous = queryClient.getQueryData<DetailEnvelope>(
      detailKey(occurrenceId),
    )?.data.notificationOn;
    writeNotificationOn(queryClient, occurrenceId, enabled);
    return { previous };
  },
  onSuccess: (envelope, { occurrenceId }) =>
    writeNotificationOn(queryClient, occurrenceId, envelope.data.enabled),
  onError: (_error, { occurrenceId }, context) => {
    if (context?.previous !== undefined)
      writeNotificationOn(queryClient, occurrenceId, context.previous);
  },
});

export const useEventSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation(eventSubscriptionMutationOptions(queryClient));
};
