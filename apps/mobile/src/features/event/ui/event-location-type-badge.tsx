import { Text, View } from "react-native";
import {
  eventLocationTypeLabel,
  type EventLocationType,
} from "../model/event-location";

/**
 * 위치 유형 pill (MSG-560 D4) — 위치 상세 헤더의 제목 우측 배지.
 * 규격은 557 개요의 `영상 N` pill과 같다(event-tint 배경 + primary 캡션).
 */
interface EventLocationTypeBadgeProps {
  type: EventLocationType;
}

export const EventLocationTypeBadge = ({
  type,
}: EventLocationTypeBadgeProps) => (
  <View className="rounded-full bg-event-tint px-sm py-0.5">
    <Text className="text-fm-caption text-primary">
      {eventLocationTypeLabel(type)}
    </Text>
  </View>
);
