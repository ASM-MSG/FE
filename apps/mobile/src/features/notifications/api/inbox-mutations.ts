import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  getInboxInfiniteQueryKey,
  getUnreadCountQueryKey,
  markAllReadMutation,
  markReadMutation,
} from "../../../shared/api/query-options";
import {
  decrementUnread,
  isUnreadInPages,
  markAllReadInPages,
  markReadInPages,
  type InboxData,
} from "../model/inbox";
import type { UnreadCountEnvelope } from "./use-unread-count-query";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const markReadFn = markReadMutation().mutationFn!;
const markAllReadFn = markAllReadMutation().mutationFn!;

/** 낙관 기록 전 스냅숏 — 실패 시 두 캐시를 통째로 되돌린다 */
interface InboxSnapshot {
  inbox: InboxData | undefined;
  unread: UnreadCountEnvelope | undefined;
}

const snapshot = async (queryClient: QueryClient): Promise<InboxSnapshot> => {
  // 진행 중 재조회가 낙관 값을 덮어쓰지 않도록 먼저 멈춘다
  await Promise.all([
    queryClient.cancelQueries({ queryKey: getInboxInfiniteQueryKey() }),
    queryClient.cancelQueries({ queryKey: getUnreadCountQueryKey() }),
  ]);
  return {
    inbox: queryClient.getQueryData<InboxData>(getInboxInfiniteQueryKey()),
    unread: queryClient.getQueryData<UnreadCountEnvelope>(
      getUnreadCountQueryKey(),
    ),
  };
};

const restore = (
  queryClient: QueryClient,
  context: InboxSnapshot | undefined,
) => {
  if (context === undefined) return;
  queryClient.setQueryData(getInboxInfiniteQueryKey(), context.inbox);
  queryClient.setQueryData(getUnreadCountQueryKey(), context.unread);
};

const setUnread = (queryClient: QueryClient, next: (count: number) => number) =>
  queryClient.setQueryData<UnreadCountEnvelope>(
    getUnreadCountQueryKey(),
    (previous) =>
      previous === undefined
        ? previous
        : {
            ...previous,
            data: { ...previous.data, count: next(previous.data.count) },
          },
  );

/** 성공·실패 무관하게 안읽음은 서버 정본으로 다시 맞춘다. 목록은 무효화하지 않는다 — 읽음 표시가 낙관 그대로 정답이고 재조회는 스크롤 위치·페이지를 흔든다 */
const settle = (queryClient: QueryClient) =>
  void queryClient.invalidateQueries({ queryKey: getUnreadCountQueryKey() });

/**
 * 알림 하나 읽음 (MSG-602 L7) — `PATCH /api/notifications/{id}/read`. 행 탭 시점.
 * 낙관: 캐시의 그 항목 read=true + 안읽음 −1(그 항목이 캐시에서 안읽음일 때만 — 이미 읽은
 * 행을 또 눌러도 배지가 음수로 가지 않는다). 실패하면 두 캐시를 스냅숏으로 되돌린다.
 * 옵션 팩토리로 분리한 이유는 RN 렌더 테스트가 없어 테스트가 `MutationObserver`로 구동하기 때문.
 */
export const markReadMutationOptions = (
  queryClient: QueryClient,
): UseMutationOptions<
  unknown,
  Error,
  { notificationId: number },
  InboxSnapshot
> => ({
  mutationFn: ({ notificationId }, context) =>
    markReadFn({ path: { notificationId } }, context),
  onMutate: async ({ notificationId }) => {
    const before = await snapshot(queryClient);
    const wasUnread = isUnreadInPages(before.inbox, notificationId);
    queryClient.setQueryData<InboxData>(
      getInboxInfiniteQueryKey(),
      (previous) => markReadInPages(previous, notificationId),
    );
    if (wasUnread) setUnread(queryClient, decrementUnread);
    return before;
  },
  onError: (_error, _variables, context) => restore(queryClient, context),
  onSettled: () => settle(queryClient),
});

/** 모두 읽음 (L7) — `PATCH /api/notifications/read-all`. 낙관: 전부 read=true + 안읽음 0 */
export const markAllReadMutationOptions = (
  queryClient: QueryClient,
): UseMutationOptions<unknown, Error, void, InboxSnapshot> => ({
  mutationFn: (_variables, context) => markAllReadFn({}, context),
  onMutate: async () => {
    const before = await snapshot(queryClient);
    queryClient.setQueryData<InboxData>(
      getInboxInfiniteQueryKey(),
      markAllReadInPages,
    );
    setUnread(queryClient, () => 0);
    return before;
  },
  onError: (_error, _variables, context) => restore(queryClient, context),
  onSettled: () => settle(queryClient),
});

export const useMarkRead = () => {
  const queryClient = useQueryClient();
  return useMutation(markReadMutationOptions(queryClient));
};

export const useMarkAllRead = () => {
  const queryClient = useQueryClient();
  return useMutation(markAllReadMutationOptions(queryClient));
};
