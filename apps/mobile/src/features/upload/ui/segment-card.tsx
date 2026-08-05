import { Pressable, Text, View } from "react-native";
import { Play } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "@fillmap/ui-native";
import type { HighlightSegment } from "../model/mock-segments";

interface SegmentCardProps {
  segment: HighlightSegment;
  selected: boolean;
  onPress: () => void;
}

/**
 * AI 추천 구간 카드 (MSG-303 AC 4·8, Figma 14094:4312) — 좌측 썸네일 플레이스홀더
 * (mock에 이미지 없음 — 회색 폴백, 추정 1) + 시간 범위·사유 + 원형 재생 버튼(순수 표시,
 * 탭 동작 없는 View — 추정 4, 제외 범위 "재생 버튼은 표시까지").
 * 선택: 파란 테두리 + 연파랑 배경 / 비선택: 기본 테두리 (AC 8).
 */
export const SegmentCard = ({
  segment,
  selected,
  onPress,
}: SegmentCardProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${segment.timeRange} ${segment.reason}`}
    accessibilityState={{ selected }}
    onPress={onPress}
    className={cx(
      "flex-row items-center gap-sm rounded-lg border p-sm active:opacity-80",
      selected ? "border-primary bg-primary/5" : "border-border bg-background",
    )}
  >
    <View className="size-11 rounded-md bg-surface" />
    <View className="flex-1 gap-0.5">
      <Text className="text-fm-body-strong text-foreground">
        {segment.timeRange}
      </Text>
      <Text className="text-fm-label text-foreground-muted">
        {segment.reason}
      </Text>
    </View>
    <View className="size-9 items-center justify-center rounded-full bg-primary/10">
      <Play size={14} color={semantic.primary} fill={semantic.primary} />
    </View>
  </Pressable>
);
