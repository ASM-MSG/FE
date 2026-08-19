import { Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";

/**
 * 시트 하단 위치 줄 (MSG-427 B8·C11) — 핀 아이콘 + 행정동명.
 * 격자 상세와 핫구역 동 요약이 같은 줄을 쓴다.
 * 행정동이 없으면(무귀속·미판정) 호출부가 렌더하지 않는다 — 빈 핀만 남기지 않기 위해서다.
 */
interface RegionLocationLineProps {
  regionName: string;
}

export const RegionLocationLine = ({ regionName }: RegionLocationLineProps) => (
  <View className="flex-row items-center gap-xs border-t border-border pt-md">
    <MapPin size={16} color={semantic.muted} />
    <Text className="text-fm-caption text-foreground">{regionName}</Text>
  </View>
);
