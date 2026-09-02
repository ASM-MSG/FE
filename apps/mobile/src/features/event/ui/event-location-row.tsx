import { Text, View } from "react-native";
import { Thumbnail } from "@fillmap/ui-native";
import type { EventLocationCardView } from "../model/event-overview";

/**
 * 행사 위치 행 (MSG-557 D9·D10) — 썸네일(폴백) · 이름 · `유형 · 운영시간` · `영상 N`.
 * 1단계는 **비인터랙티브**(웹 MSG-534 카드 탭·셰브론 미포팅 — 위치별 영상은 후속 티켓).
 * 2단계 확장점: Pressable + `onSelect` (Figma 15767:835).
 */
interface EventLocationRowProps {
  card: EventLocationCardView;
}

export const EventLocationRow = ({ card }: EventLocationRowProps) => (
  <View className="flex-row items-center gap-sm rounded-md border border-border bg-background p-sm">
    <Thumbnail
      src={card.imageUrl ?? undefined}
      className="size-10 rounded-xs"
    />
    <View className="flex-1 gap-xxs">
      <Text numberOfLines={1} className="text-fm-body-strong text-foreground">
        {card.name}
      </Text>
      <Text numberOfLines={1} className="text-fm-caption text-foreground-muted">
        {card.meta}
      </Text>
    </View>
    <View className="rounded-full bg-event-tint px-sm py-0.5">
      <Text className="text-fm-caption text-primary">{card.videoBadge}</Text>
    </View>
  </View>
);
