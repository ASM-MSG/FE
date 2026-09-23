import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Inbox } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Button } from "@fillmap/ui-native";
import {
  canAutoLoadMore,
  infiniteListState,
} from "../../../shared/api/infinite-list";
import { DexErrorState } from "../../dex/ui/dex-error-state";
import { useMarkAllRead, useMarkRead } from "../api/inbox-mutations";
import { useInboxQuery } from "../api/use-inbox-query";
import { useUnreadCountQuery } from "../api/use-unread-count-query";
import { hasUnread, unreadHint, type InboxItem } from "../model/inbox";
import { NotificationRow } from "./notification-row";

const keyOf = (item: InboxItem) => String(item.notificationId);

/**
 * 알림함 (MSG-602 — 시안 없음, 신고 관리·차단 목록과 같은 앱 관례). 프로필 설정에서 push.
 * 요약 행(안읽음 N·모두 읽음) + FlatList(커서 이어받기·당겨서 새로고침) + 4상태 스위치.
 * 행 탭은 안읽은 행만 읽음 처리한다 — 이미 읽은 행은 서버 왕복 없이 조용히 끝난다.
 */
export const NotificationInboxScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inbox = useInboxQuery();
  const unread = useUnreadCountQuery();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const state = infiniteListState(inbox);
  const unreadCount = unread.data;
  const { mutate: markReadMutate } = markRead;
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

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="알림함" onBack={() => router.back()} />
      {state === "error" ? (
        <View className="px-5 pt-md">
          <DexErrorState
            title="알림을 불러오지 못했어요"
            description="네트워크 상태를 확인하고 다시 시도해 주세요"
            onRetry={() => void inbox.refetch()}
          />
        </View>
      ) : state === "loading" ? (
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
              // 요약 행 — AppHeader 우측 슬롯이 16px 박스라 텍스트 액션은 여기 둔다
              <View className="flex-row items-center justify-between pb-xxs">
                <Text className="text-fm-label text-foreground-muted">
                  {unreadHint(unreadCount) ?? "모두 읽었어요"}
                </Text>
                {hasUnread(unreadCount) && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="모두 읽음 처리"
                    disabled={markAllRead.isPending}
                    onPress={() => markAllRead.mutate()}
                    className="active:opacity-60"
                  >
                    <Text className="text-fm-label text-primary">
                      모두 읽음
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center gap-sm py-xl">
              <View className="size-14 items-center justify-center rounded-full bg-surface-soft">
                <Inbox size={28} color={semantic.muted} />
              </View>
              <View className="items-center gap-xxs">
                <Text className="text-fm-title text-foreground">
                  받은 알림이 없어요
                </Text>
                <Text className="text-center text-fm-body text-foreground-muted">
                  최근 30일 동안 받은 알림이 여기에 쌓여요
                </Text>
              </View>
            </View>
          }
          ListFooterComponent={
            inbox.isLoadingMore ? (
              <View className="py-md">
                <ActivityIndicator color={semantic.primary} />
              </View>
            ) : inbox.loadMoreFailed ? (
              <View className="items-center gap-xs py-md">
                <Text className="text-fm-caption text-foreground-muted">
                  더 불러오지 못했어요
                </Text>
                <Button
                  text="다시 시도"
                  variant="secondary"
                  size="sm"
                  onPress={inbox.loadMore}
                />
              </View>
            ) : null
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
};
