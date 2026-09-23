import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader } from "@fillmap/ui-native";
import {
  canAutoLoadMore,
  infiniteListState,
} from "../../../shared/api/infinite-list";
import { DexErrorState } from "../../dex/ui/dex-error-state";
import { useMarkAllRead, useMarkRead } from "../api/inbox-mutations";
import { useInboxQuery } from "../api/use-inbox-query";
import { useUnreadCountQuery } from "../api/use-unread-count-query";
import type { InboxItem } from "../model/inbox";
import {
  InboxEmptyState,
  InboxFooter,
  InboxSummaryRow,
} from "./notification-inbox-parts";
import { NotificationRow } from "./notification-row";

const keyOf = (item: InboxItem) => String(item.notificationId);

/**
 * 알림함 (MSG-602 — 시안 없음, 신고 관리·차단 목록과 같은 앱 관례). 프로필 설정에서 push.
 * 요약 행(안읽음 N·모두 읽음) + FlatList(커서 이어받기·당겨서 새로고침) + 4상태 스위치.
 * 행 탭은 안읽은 행만 읽음 처리한다 — 이미 읽은 행은 서버 왕복 없이 조용히 끝난다.
 * 머리·꼬리·빈 상태는 `notification-inbox-parts`가 그린다(PR #158 리뷰 — 복잡도 분리).
 * `DexErrorState`는 dex 밖 3번째 사용처 — ui-native 승격 후보(DECISIONS 2026-09-23).
 */
export const NotificationInboxScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inbox = useInboxQuery();
  const unread = useUnreadCountQuery();
  const { mutate: markReadMutate } = useMarkRead();
  const markAllRead = useMarkAllRead();
  const state = infiniteListState(inbox);
  // 행 핸들러·renderItem은 목록 스코프에서 한 번만 만든다 (react-doctor rn-no-inline-flatlist-renderitem)
  const handleRead = useCallback(
    (notificationId: number) => markReadMutate({ notificationId }),
    [markReadMutate],
  );
  const renderItem = useCallback(
    ({ item }: { item: InboxItem }) => (
      <NotificationRow item={item} onRead={handleRead} />
    ),
    [handleRead],
  );
  const refresh = () => {
    void inbox.refetch();
    void unread.refetch();
  };

  if (state === "error") {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <AppHeader title="알림함" onBack={() => router.back()} />
        <View className="px-5 pt-md">
          <DexErrorState
            title="알림을 불러오지 못했어요"
            description="네트워크 상태를 확인하고 다시 시도해 주세요"
            onRetry={() => void inbox.refetch()}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="알림함" onBack={() => router.back()} />
      {state === "loading" ? (
        <View className="py-xl">
          <ActivityIndicator color={semantic.primary} />
        </View>
      ) : (
        <FlatList
          data={inbox.items ?? []}
          keyExtractor={keyOf}
          contentContainerClassName="gap-sm px-5 pb-lg pt-md"
          refreshControl={
            <RefreshControl
              refreshing={inbox.isRefreshing}
              onRefresh={refresh}
              tintColor={semantic.primary}
              colors={[semantic.primary]}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={canAutoLoadMore(inbox) ? inbox.loadMore : undefined}
          ListHeaderComponent={
            state === "list" ? (
              <InboxSummaryRow
                unreadCount={unread.data}
                markingAll={markAllRead.isPending}
                onMarkAll={() => markAllRead.mutate()}
              />
            ) : null
          }
          ListEmptyComponent={<InboxEmptyState />}
          ListFooterComponent={
            <InboxFooter
              loadingMore={inbox.isLoadingMore}
              loadMoreFailed={inbox.loadMoreFailed}
              onRetry={inbox.loadMore}
            />
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
};
