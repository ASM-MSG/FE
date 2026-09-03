import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Thumbnail } from "@fillmap/ui-native";
import type { EventLocationCardView } from "../model/event-overview";

/**
 * 행사 위치 행 (MSG-557 D9 → MSG-560 D10) — 썸네일(폴백) · 이름 · `유형 · 운영시간` ·
 * `영상 N` · 셰브론. 행 전체가 버튼이고 탭하면 위치 상세 시트가 열린다.
 * 접근명은 위치명 + 행동 + 시각 노출 맥락(meta·videoBadge) — 웹 `EventLocationCard` 미러.
 */
interface EventLocationRowProps {
  card: EventLocationCardView;
  /** 위치 id만 올린다 — 선택 스냅숏은 조립 훅이 원본 DTO 목록에서 만든다 (지도 셀 탭과 같은 경로) */
  onSelect: (locationId: number) => void;
}

const CHEVRON_SIZE = 16;

export const EventLocationRow = ({ card, onSelect }: EventLocationRowProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${card.name} 위치 영상 보기 — ${card.meta}, ${card.videoBadge}`}
    onPress={() => onSelect(card.locationId)}
    className="flex-row items-center gap-sm rounded-md border border-border bg-background p-sm active:opacity-80"
  >
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
    <ChevronRight size={CHEVRON_SIZE} color={semantic.muted} />
  </Pressable>
);
