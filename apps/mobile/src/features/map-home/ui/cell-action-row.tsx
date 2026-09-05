import { Pressable, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";

/**
 * 격자 상세·핫구역 요약의 액션 행 (MSG-427 B6·C9) — 영상 추가 단일 행.
 * Figma 실측: 이 행은 핫구역 요약(화면 1)·핫구역 격자 상세(화면 2)에만 있고,
 * 미션/코스 상세(4·6·8)와 코스 스팟 격자 상세(9)에는 **없다** — 호출부가 렌더를 가른다.
 *
 * 공유·저장 칸은 MSG-573에서 제거했다 — 대응 API가 없어 표시 전용이었는데(MSG-427 추정 5)
 * 버튼처럼 보여 QA 혼란만 줬다. 기능이 생기면 여기에 Pressable로 되살린다.
 */
const ICON_SIZE = 20;

interface CellActionRowProps {
  /** [영상 추가] — 업로드 화면으로 (B6) */
  onUpload: () => void;
}

export const CellActionRow = ({ onUpload }: CellActionRowProps) => (
  <View className="flex-row rounded-md border border-border py-xs">
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="영상 추가"
      onPress={onUpload}
      className="flex-1 items-center gap-xxs py-xxs active:opacity-80"
    >
      <Plus size={ICON_SIZE} color={semantic.primary} />
      <Text className="text-fm-caption text-foreground">영상 추가</Text>
    </Pressable>
  </View>
);
