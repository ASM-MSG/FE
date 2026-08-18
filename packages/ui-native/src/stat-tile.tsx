import { Text, View } from "react-native";
import { cx } from "./lib/cx";

interface StatTileProps {
  /** 통계 값 — 포맷된 문자열(예: "12", "68%") */
  value: string;
  label: string;
  className?: string;
}

/**
 * SOURCE: Figma 격자 상세 `stats`(node 14799:25892, 3×111.33×56) ·
 * 도감 `dex-stats`(node 14828:474) — 값 + 라벨 2줄 통계 타일.
 * flex-1이라 가로 row에 나란히 두면 균등 폭으로 늘어난다.
 * 값 글자는 Figma 18px에 가장 가까운 타이포 토큰 fm-display(20px)를 쓴다
 * (토큰에 18px 단이 없음 — 임의값 금지).
 *
 * @example
 * <View className="flex-row">
 *   <StatTile value="12" label="수집 영상" />
 *   <StatTile value="4" label="수집 격자" />
 * </View>
 */
export const StatTile = ({ value, label, className }: StatTileProps) => (
  <View className={cx("flex-1 items-center justify-center gap-0.5", className)}>
    <Text className="text-fm-display text-foreground">{value}</Text>
    <Text className="text-fm-label text-foreground-muted">{label}</Text>
  </View>
);
