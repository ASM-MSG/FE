import { Pressable, Text, View } from "react-native";
import type { EventCardView } from "../model/event-card";
import { EventStatusBadge } from "./event-status-badge";

/**
 * 행사 목록 카드 (MSG-557 D6) — 제목 + 상태 배지 + `{cityName} · {M.D–M.D}`.
 * 썸네일·위치 수·영상 수는 칩 DTO에 없어 그리지 않는다(Figma 오탐 목록). 탭 → 개요.
 */
interface EventCardProps {
  view: EventCardView;
  onSelect: (view: EventCardView) => void;
}

export const EventCard = ({ view, onSelect }: EventCardProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={view.title}
    onPress={() => onSelect(view)}
    className="gap-1.75 rounded-md bg-background p-3 shadow-raised active:opacity-80"
  >
    <View className="flex-row items-start gap-xs">
      <Text
        numberOfLines={1}
        className="flex-1 text-fm-body-strong text-foreground"
      >
        {view.title}
      </Text>
      {view.badge && <EventStatusBadge badge={view.badge} />}
    </View>
    <Text numberOfLines={1} className="text-fm-label text-foreground-muted">
      {view.subtitle}
    </Text>
  </Pressable>
);
