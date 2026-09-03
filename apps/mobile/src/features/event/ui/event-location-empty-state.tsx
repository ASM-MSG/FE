import { Text, View } from "react-native";
import { Play } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Button } from "@fillmap/ui-native";

/**
 * 빈 행사 위치 상태 (MSG-560 D6) — 웹 `EventLocationEmptyState.tsx` 참조본의 RN 재작성.
 * 재생 아이콘 원 + 안내 2줄 + 전폭 `첫 영상 올리기`.
 * 종료 행사 열람(readOnly)이면 CTA를 렌더하지 않고 보관 맥락 문구로 바꾼다 (D8).
 */
interface EventLocationEmptyStateProps {
  readOnly: boolean;
  onUpload: () => void;
}

const ICON_SIZE = 24;

export const EventLocationEmptyState = ({
  readOnly,
  onUpload,
}: EventLocationEmptyStateProps) => (
  <View className="items-center gap-lg rounded-md border border-border bg-background px-lg py-9">
    <View className="size-18 items-center justify-center rounded-full bg-event-tint">
      <Play size={ICON_SIZE} color={semantic.primary} fill={semantic.primary} />
    </View>
    <View className="items-center gap-xs">
      <Text className="text-fm-title text-foreground">
        {readOnly
          ? "이 위치에 남은 영상이 없어요"
          : "아직 이 위치에 올라온 영상이 없어요"}
      </Text>
      <Text className="text-fm-body text-foreground-muted">
        {readOnly
          ? "행사 기간에 올라온 영상이 없었어요"
          : "현장 영상을 가장 먼저 남겨보세요"}
      </Text>
    </View>
    {!readOnly && (
      <Button text="첫 영상 올리기" className="w-full" onPress={onUpload} />
    )}
  </View>
);
