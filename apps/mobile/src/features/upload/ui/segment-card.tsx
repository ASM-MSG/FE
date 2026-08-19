import { Pressable, Text, View } from "react-native";
import { Play } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "@fillmap/ui-native";
import {
  formatSegmentLabel,
  type HighlightSuggestion,
} from "../model/highlight-selection";

interface SegmentCardProps {
  suggestion: HighlightSuggestion;
  selected: boolean;
  /** 행 선택 (기준 12·13) */
  onPress: () => void;
  /** 원형 재생 버튼 — 프리뷰를 구간 시작으로 seek해 재생 (기준 17) */
  onPlay: () => void;
}

/**
 * AI 추천 구간 카드 (기준 11·12·17, Figma 14799:25984) — 좌측 썸네일 플레이스홀더 +
 * 시간 범위 + 우측 원형 재생 버튼. 선택: 파란 테두리 + 연파랑 배경 / 비선택: 기본 테두리.
 *
 * **사유 텍스트 행은 렌더하지 않는다 (D2).** 서버 `HighlightPreviewResponseDto`가
 * 시간쌍만 주므로 표시할 근거가 없다 — Figma의 "움직임·밝기 지속" 등은 플레이스홀더이고
 * (오탐 방지 1), 웹도 같은 이유로 사유 라벨을 이미 폐기했다. 요소 누락이 정답이다.
 */
export const SegmentCard = ({
  suggestion,
  selected,
  onPress,
  onPlay,
}: SegmentCardProps) => {
  const label = formatSegmentLabel(suggestion);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cx(
        "flex-row items-center gap-sm rounded-lg border p-sm active:opacity-80",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background",
      )}
    >
      <View className="size-11 rounded-md bg-surface" />
      <Text className="flex-1 text-fm-body-strong text-foreground">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 구간 재생`}
        onPress={onPlay}
        className="size-9 items-center justify-center rounded-full bg-primary/10 active:opacity-80"
      >
        <Play size={14} color={semantic.primary} fill={semantic.primary} />
      </Pressable>
    </Pressable>
  );
};
