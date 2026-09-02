import { Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import type { EventStatusBadge as EventStatusBadgeView } from "../model/event-status";

/**
 * 행사 상태 배지 (MSG-557 D7·D21) — `D-n`은 primary 틴트(마감 임박 신호), `지난 행사 기록`은
 * 무채색. `mission-status-badge`의 urgent/종료 규칙 미러. LIVE는 배지 자체가 없다.
 */
interface EventStatusBadgeProps {
  badge: EventStatusBadgeView;
}

export const EventStatusBadge = ({ badge }: EventStatusBadgeProps) => {
  const upcoming = badge.kind === "upcoming";
  return (
    <View
      className={cx(
        "rounded-full px-1.75 py-0.75",
        upcoming ? "bg-primary/10" : "bg-surface",
      )}
    >
      <Text
        className={cx(
          "text-fm-caption",
          upcoming ? "text-primary" : "text-foreground-muted",
        )}
      >
        {badge.label}
      </Text>
    </View>
  );
};
