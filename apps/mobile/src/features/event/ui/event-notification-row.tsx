import { Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Switch } from "@fillmap/ui-native";
import { useEventSubscription } from "../api/event-subscription-mutation";
import {
  EVENT_SUBSCRIPTION_ERROR_TEXT,
  type EventSubscriptionView,
} from "../model/event-subscription";

/**
 * 행사 알림 토글 행 (MSG-603 — 시안 없음). 개요 시트 기간 행 아래 한 줄: 🔔 행사 알림 + Switch,
 * 캡션으로 무엇이 오는지 알린다. 표시값은 상세 캐시(`notificationOn`)라 낙관 기록이 곧 화면이다.
 * 실패 안내는 프로필 "알림 받기"와 같은 인라인 캡션(신규 토스트 인프라 없음).
 */
export const EventNotificationRow = ({
  occurrenceId,
  view,
}: {
  occurrenceId: number;
  view: EventSubscriptionView;
}) => {
  const subscription = useEventSubscription(occurrenceId);
  return (
    <View className="gap-xxs rounded-md border border-border bg-surface-soft px-md py-sm">
      <View className="flex-row items-center gap-sm">
        <Bell size={18} color={semantic.primary} />
        <View className="flex-1 gap-0.5">
          <Text className="text-fm-body text-foreground">행사 알림</Text>
          <Text className="text-fm-caption text-foreground-muted">
            시작할 때와 일정이 바뀌면 알려드려요
          </Text>
        </View>
        <Switch
          checked={view.enabled}
          disabled={subscription.isPending}
          accessibilityLabel="행사 알림 받기"
          onCheckedChange={(enabled) =>
            subscription.mutate({ occurrenceId, enabled })
          }
        />
      </View>
      {subscription.isError && (
        <Text
          accessibilityLiveRegion="polite"
          className="text-fm-caption text-red-600"
        >
          {EVENT_SUBSCRIPTION_ERROR_TEXT}
        </Text>
      )}
    </View>
  );
};
