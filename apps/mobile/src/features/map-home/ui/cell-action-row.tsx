import { Pressable, Text, View } from "react-native";
import { Bookmark, Plus, Share2 } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";

/**
 * 격자 상세·핫구역 요약의 액션 행 (MSG-427 B6·C9) — 영상 추가 · 공유 · 저장 3분할.
 * Figma 실측: 이 행은 핫구역 요약(화면 1)·핫구역 격자 상세(화면 2)에만 있고,
 * 미션/코스 상세(4·6·8)와 코스 스팟 격자 상세(9)에는 **없다** — 호출부가 렌더를 가른다.
 *
 * 공유·저장은 대응 API가 없어 **표시 전용**이다 (스펙 추정 5): 누를 수 있는 것처럼
 * 보이지 않도록 Pressable로 만들지 않는다 — 스크린리더에 가짜 버튼을 노출하지 않는
 * 것이 영상 카드(B10)와 같은 판단이다.
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
    <View className="flex-1 items-center gap-xxs py-xxs">
      <Share2 size={ICON_SIZE} color={semantic.muted} />
      <Text className="text-fm-caption text-foreground-muted">공유</Text>
    </View>
    <View className="flex-1 items-center gap-xxs py-xxs">
      <Bookmark size={ICON_SIZE} color={semantic.muted} />
      <Text className="text-fm-caption text-foreground-muted">저장</Text>
    </View>
  </View>
);
