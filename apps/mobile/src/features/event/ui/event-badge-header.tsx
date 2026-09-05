import { Text, View } from "react-native";

/**
 * 행사 목록 시트 헤더 (MSG-557 D1) — `이벤트 · N개`. `theme-badge-header` 미러(primary 틴트).
 * Figma 15767:463 — 목록 시트에는 뒤로가기도 ✕도 없다(해제는 칩 재탭, D14).
 */
interface EventBadgeHeaderProps {
  count: number;
}

export const EventBadgeHeader = ({ count }: EventBadgeHeaderProps) => (
  <View className="flex-row items-center gap-1.5">
    <View className="rounded-full bg-primary/10 px-1.75 py-0.75">
      <Text className="text-fm-caption text-primary">이벤트</Text>
    </View>
    <Text className="text-fm-label text-foreground-muted">· {count}개</Text>
  </View>
);
