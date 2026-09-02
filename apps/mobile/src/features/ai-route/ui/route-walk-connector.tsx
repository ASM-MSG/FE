import { Text, View } from "react-native";

/**
 * 카드 사이 도보 구간 행 (Figma 15751:448) — 2×16 세로선 + "도보 약 Nm".
 * 거리 파생은 `route-legs`가 소유하고 여기는 표기만 한다.
 *
 * [MSG-490 확장점] 실보행/추정 표기 구분이 여기에 얹힌다.
 */
interface RouteWalkConnectorProps {
  label: string;
}

export const RouteWalkConnector = ({ label }: RouteWalkConnectorProps) => (
  <View className="flex-row items-center gap-xs pl-3.5">
    <View className="h-4 w-0.5 rounded-full bg-hairline-strong" />
    <Text className="text-fm-caption text-foreground-muted">{label}</Text>
  </View>
);
