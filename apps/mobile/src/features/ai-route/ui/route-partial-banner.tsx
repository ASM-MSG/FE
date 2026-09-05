import { Text, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";

/**
 * 결과 부족 배너 (Figma 15751:25047) — warning 10% 면 + circle-alert + 본문.
 * 문구는 FE 고정이고(partialBannerText) 서버 `notice` 문자열은 화면에 나타나지 않는다 (L3).
 */
interface RoutePartialBannerProps {
  text: string;
}

export const RoutePartialBanner = ({ text }: RoutePartialBannerProps) => (
  <View className="flex-row items-start gap-xs rounded-md bg-warning/10 p-sm">
    <CircleAlert size={16} color={semantic.warning} />
    <Text className="flex-1 text-fm-body text-foreground">{text}</Text>
  </View>
);
