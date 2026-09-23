import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import { formatInboxTime, type InboxItem } from "../model/inbox";
import { NotificationCategoryIcon } from "./notification-category-icon";

/**
 * 알림 1건 행 (MSG-602 S3). 안읽음은 배경(surface-soft)과 제목 옆 파란 점으로, 읽음은 흰 배경에
 * 제목을 body 톤으로 낮춘다. 탭은 읽음 처리만 한다 — 이동은 MSG-432(딥링크 계약) 이후.
 * `memo` + 목록 스코프 핸들러(id 인자): 낙관 읽음으로 한 행만 바뀔 때 나머지 행은 다시 그리지 않는다
 * (react-doctor rn-list-callback-per-row). 이미 읽은 행은 서버 왕복 없이 조용히 끝난다.
 */
export const NotificationRow = memo(function NotificationRow({
  item,
  onRead,
}: {
  item: InboxItem;
  onRead: (notificationId: number) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? "" : "안읽음, "}${item.title}`}
      onPress={() => {
        if (!item.read) onRead(item.notificationId);
      }}
      className={cx(
        "flex-row gap-sm rounded-md border border-border p-md active:opacity-70",
        item.read ? "bg-background" : "bg-surface-soft",
      )}
    >
      <NotificationCategoryIcon category={item.category} />
      <View className="min-w-0 flex-1 gap-xxs">
        <View className="flex-row items-center gap-1.5">
          <Text
            className={cx(
              "shrink text-fm-body",
              item.read ? "text-foreground-body" : "text-foreground",
            )}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.read && <View className="size-2 rounded-full bg-primary" />}
        </View>
        <Text
          className="text-fm-caption text-foreground-muted"
          numberOfLines={2}
        >
          {item.body}
        </Text>
        <Text className="text-fm-caption text-foreground-muted">
          {formatInboxTime(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
});
