import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Inbox } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Button } from "@fillmap/ui-native";
import { hasUnread, unreadHint } from "../model/inbox";

/**
 * 알림함 목록의 머리·꼬리·빈 상태 조각 (MSG-602, PR #158 리뷰 — 화면 복잡도 분리).
 * 상태를 갖지 않고 재료만 받는다 — 화면(`notification-inbox-screen`)이 조립한다.
 */

/** 요약 행 — AppHeader 우측 슬롯이 16px 박스라 텍스트 액션은 목록 머리에 둔다 */
export const InboxSummaryRow = ({
  unreadCount,
  markingAll,
  onMarkAll,
}: {
  unreadCount: number | undefined;
  markingAll: boolean;
  onMarkAll: () => void;
}) => (
  <View className="flex-row items-center justify-between pb-xxs">
    <Text className="text-fm-label text-foreground-muted">
      {unreadHint(unreadCount) ?? "모두 읽었어요"}
    </Text>
    {hasUnread(unreadCount) && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="모두 읽음 처리"
        // 시각·터치뿐 아니라 스크린리더에도 비활성을 알린다 (PR #158 리뷰)
        accessibilityState={{ disabled: markingAll }}
        disabled={markingAll}
        onPress={onMarkAll}
        className="active:opacity-60"
      >
        <Text className="text-fm-label text-primary">모두 읽음</Text>
      </Pressable>
    )}
  </View>
);

export const InboxEmptyState = () => (
  <View className="items-center gap-sm py-xl">
    <View className="size-14 items-center justify-center rounded-full bg-surface-soft">
      <Inbox size={28} color={semantic.muted} />
    </View>
    <View className="items-center gap-xxs">
      <Text className="text-fm-title text-foreground">받은 알림이 없어요</Text>
      <Text className="text-center text-fm-body text-foreground-muted">
        최근 30일 동안 받은 알림이 여기에 쌓여요
      </Text>
    </View>
  </View>
);

/** 이어받기 로더 / 이어받기 실패 재시도 — 둘 다 아니면 null */
export const InboxFooter = ({
  loadingMore,
  loadMoreFailed,
  onRetry,
}: {
  loadingMore: boolean;
  loadMoreFailed: boolean;
  onRetry: () => void;
}) => {
  if (loadingMore) {
    return (
      <View className="py-md">
        <ActivityIndicator color={semantic.primary} />
      </View>
    );
  }
  if (!loadMoreFailed) return null;
  return (
    <View className="items-center gap-xs py-md">
      <Text className="text-fm-caption text-foreground-muted">
        더 불러오지 못했어요
      </Text>
      <Button
        text="다시 시도"
        variant="secondary"
        size="sm"
        onPress={onRetry}
      />
    </View>
  );
};
