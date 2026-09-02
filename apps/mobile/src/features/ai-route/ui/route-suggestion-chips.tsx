import { Text, View } from "react-native";
import { Chip } from "@fillmap/ui-native";

/**
 * 예시 문장 칩 (Figma 15750:466) — 누르면 그 문장이 입력창에 채워진다 (S3).
 * 문구는 FE가 고정으로 심는 실문구다 (MVP 지역 = 부산 서면, 웹과 동일).
 * ui-native Chip 기본에는 보더가 없어 `border-border`를 덧댄다 — `active`는 쓰지 않는다
 * (체크 아이콘이 강제되므로, 웹과 같은 판단).
 */
const SUGGESTIONS = [
  "서면에서 밥 먹고 저녁 경기까지 동선 짜 줘",
  "지금 하는 축제 위주로 반나절 코스",
] as const;

interface RouteSuggestionChipsProps {
  onSelect: (text: string) => void;
}

export const RouteSuggestionChips = ({
  onSelect,
}: RouteSuggestionChipsProps) => (
  <View className="items-start gap-xs">
    <Text className="text-fm-label text-foreground-muted">
      이렇게 물어보세요
    </Text>
    {SUGGESTIONS.map((text) => (
      <Chip
        key={text}
        text={text}
        className="border border-border"
        onPress={() => onSelect(text)}
      />
    ))}
  </View>
);
