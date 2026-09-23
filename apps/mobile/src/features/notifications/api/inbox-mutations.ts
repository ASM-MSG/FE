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

/** 진행 중 재조회가 낙관 값을 덮어쓰지 않도록 먼저 멈춘다 */
const cancelInboxQueries = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.cancelQueries({ queryKey: getInboxInfiniteQueryKey() }),
    queryClient.cancelQueries({ queryKey: getUnreadCountQueryKey() }),
  ]);

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

/**
 * 실패 복구는 **스냅숏 롤백이 아니라 서버 재동기화**다 (codex P2). 두 행을 연달아 누르거나
 * 행 탭 직후 "모두 읽음"을 누르면 요청이 겹치는데, 먼저 시작한 요청이 실패했을 때 스냅숏으로
 * 되돌리면 나중 요청이 성공한 항목까지 안읽음으로 돌아가 서버와 화면이 갈라진다. 실패 경로에서만
 * 목록·개수를 무효화해 정본을 다시 받는다 — 성공 경로의 목록은 무효화하지 않는다(낙관값이 곧 정답,
 * 재조회는 스크롤·페이지를 흔든다).
 */
const resyncOnError = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: getInboxInfiniteQueryKey() });
  void queryClient.invalidateQueries({ queryKey: getUnreadCountQueryKey() });
};

/** 성공·실패 무관하게 안읽음 개수는 서버 정본으로 다시 맞춘다 */
const settle = (queryClient: QueryClient) =>
  void queryClient.invalidateQueries({ queryKey: getUnreadCountQueryKey() });

/**
 * 알림 하나 읽음 (MSG-602 L7) — `PATCH /api/notifications/{id}/read`. 행 탭 시점.
 * 낙관: 캐시의 그 항목 read=true + 안읽음 −1(그 항목이 캐시에서 안읽음일 때만 — 이미 읽은
 * 행을 또 눌러도 배지가 음수로 가지 않는다).
 * 옵션 팩토리로 분리한 이유는 RN 렌더 테스트가 없어 테스트가 `MutationObserver`로 구동하기 때문.
 */
export const markReadMutationOptions = (
  queryClient: QueryClient,
): UseMutationOptions<unknown, Error, { notificationId: number }> => ({
  mutationFn: ({ notificationId }, context) =>
    markReadFn({ path: { notificationId } }, context),
  onMutate: async ({ notificationId }) => {
    await cancelInboxQueries(queryClient);
    const wasUnread = isUnreadInPages(
      queryClient.getQueryData<InboxData>(getInboxInfiniteQueryKey()),
      notificationId,
    );
    queryClient.setQueryData<InboxData>(
      getInboxInfiniteQueryKey(),
      (previous) => markReadInPages(previous, notificationId),
    );
    if (wasUnread) setUnread(queryClient, decrementUnread);
  },
  onError: () => resyncOnError(queryClient),
  onSettled: () => settle(queryClient),
});

/** 모두 읽음 (L7) — `PATCH /api/notifications/read-all`. 낙관: 전부 read=true + 안읽음 0 */
export const markAllReadMutationOptions = (
  queryClient: QueryClient,
): UseMutationOptions<unknown, Error, void> => ({
  mutationFn: (_variables, context) => markAllReadFn({}, context),
  onMutate: async () => {
    await cancelInboxQueries(queryClient);
    queryClient.setQueryData<InboxData>(
      getInboxInfiniteQueryKey(),
      markAllReadInPages,
    );
    setUnread(queryClient, () => 0);
  },
  onError: () => resyncOnError(queryClient),
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
