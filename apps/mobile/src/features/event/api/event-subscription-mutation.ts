import {
  useMutation,
  useMutationState,
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

/** 회차별 mutation key — 재마운트된 행도 같은 회차의 진행 중 요청을 본다 (codex P2) */
export const eventSubscriptionMutationKey = (occurrenceId: number) =>
  ["event-subscription", occurrenceId] as const;

/**
 * 회차별 최신 요청 순번 (codex P2). 응답이 느릴 때 위치 상세에 들어갔다 돌아오면 토글 행이
 * 재마운트돼 `isPending`이 초기화되고 같은 회차에 두 요청이 겹칠 수 있다. 늦게 도착한 앞 요청의
 * 응답·롤백이 뒤 요청의 값을 덮지 않도록, 순번이 최신인 요청만 캐시를 만진다.
 * 모듈 스코프인 이유: 컴포넌트 수명과 무관해야 하고 QueryClient 밖 상태가 이 하나뿐이라
 * 전용 저장소를 만들지 않는다.
 */
const latestSeq = new Map<number, number>();
let seqCounter = 0;
const nextSeq = (occurrenceId: number): number => {
  const seq = ++seqCounter;
  latestSeq.set(occurrenceId, seq);
  return seq;
};
const isLatest = (occurrenceId: number, seq: number): boolean =>
  latestSeq.get(occurrenceId) === seq;
/** 마지막 요청이 끝나면 항목을 지운다 — 세션 동안 만진 회차마다 쌓이지 않게 (PR #159 리뷰) */
const releaseSeq = (occurrenceId: number, seq: number): void => {
  if (isLatest(occurrenceId, seq)) latestSeq.delete(occurrenceId);
};

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

interface EventSubscriptionContext {
  previous: boolean | undefined;
  seq: number;
}

/**
 * 행사 알림 구독 토글 (MSG-603 L3) — `PUT /api/event-occurrences/{id}/notification`.
 * 낙관: 상세 캐시 `notificationOn`을 즉시 바꾼다. 성공: 응답 `enabled`(노출 파생값 — 요청 사이에
 * 회차가 종료됐으면 false)를 기록. 실패: 직전 값으로 되돌린다. 겹친 요청은 **최신 순번만**
 * 캐시를 만진다 — 늦게 온 앞 요청의 성공·롤백이 뒤 요청의 값을 덮지 않는다(codex P2).
 * 옵션 팩토리로 분리한 이유는 RN 렌더 테스트가 없어 테스트가 `MutationObserver`로 구동하기 때문.
 */
export const eventSubscriptionMutationOptions = (
  queryClient: QueryClient,
  occurrenceId?: number,
): UseMutationOptions<
  ApiResponseDtoEventNotificationResponseDto,
  Error,
  EventSubscriptionVariables,
  EventSubscriptionContext
> => ({
  mutationKey:
    occurrenceId === undefined
      ? undefined
      : eventSubscriptionMutationKey(occurrenceId),
  mutationFn: async ({ occurrenceId, enabled }, context) => {
    const result = await updateSubscriptionFn(
      { path: { occurrenceId }, body: { enabled } },
      context,
    );
    return result as ApiResponseDtoEventNotificationResponseDto;
  },
  onMutate: async ({ occurrenceId, enabled }) => {
    const seq = nextSeq(occurrenceId);
    await queryClient.cancelQueries({ queryKey: detailKey(occurrenceId) });
    const previous = queryClient.getQueryData<DetailEnvelope>(
      detailKey(occurrenceId),
    )?.data.notificationOn;
    writeNotificationOn(queryClient, occurrenceId, enabled);
    return { previous, seq };
  },
  onSuccess: (envelope, { occurrenceId }, context) => {
    if (isLatest(occurrenceId, context.seq))
      writeNotificationOn(queryClient, occurrenceId, envelope.data.enabled);
  },
  onError: (_error, { occurrenceId }, context) => {
    if (
      context !== undefined &&
      isLatest(occurrenceId, context.seq) &&
      context.previous !== undefined
    )
      writeNotificationOn(queryClient, occurrenceId, context.previous);
  },
  onSettled: (_data, _error, { occurrenceId }, context) => {
    if (context !== undefined) releaseSeq(occurrenceId, context.seq);
  },
});

/**
 * 행 훅 — `isPending`·`isError`를 이 컴포넌트의 `useMutation` 인스턴스가 아니라 **같은 회차
 * mutationKey의 최신 mutation**에서 읽는다(PR #159 리뷰). 위치 상세에 들어갔다 돌아오면 행이
 * 재마운트돼 인스턴스 로컬 상태가 초기화되는데, 그 사이 끝난 옛 요청의 실패 안내와 진행 중 표시가
 * 사라지면 안 된다. `useMutationState`는 MutationCache 삽입 순이라 마지막 원소가 최신 요청이다.
 */
export const useEventSubscription = (occurrenceId: number) => {
  const queryClient = useQueryClient();
  const mutation = useMutation(
    eventSubscriptionMutationOptions(queryClient, occurrenceId),
  );
  const statuses = useMutationState({
    filters: { mutationKey: eventSubscriptionMutationKey(occurrenceId) },
    select: (m) => m.state.status,
  });
  return {
    mutate: mutation.mutate,
    isPending: statuses.includes("pending"),
    isError: statuses.at(-1) === "error",
  };
};
