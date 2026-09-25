import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

interface ActivityTile {
  icon: ReactNode;
  value: string;
  label: string;
}

/**
 * SOURCE: Figma "제안 — 프로필/설정 리디자인" stat 타일 3개 (node 16182:359, 2026-09-25).
 * 스트릭 · 수집률 · 내 영상. 값이 없으면 `—`(별도 오류 UI 없음 — 웹 `ActivityCard` 미러, 결정 D9).
 * 탭하면 도감으로 간다(호출부가 결정).
 */
export const ActivityTiles = ({
  tiles,
  onPress,
}: {
  tiles: readonly ActivityTile[];
  onPress: () => void;
}) => (
  <View className="flex-row gap-xs">
    {tiles.map((tile) => (
      <Pressable
        key={tile.label}
        accessibilityRole="button"
        accessibilityLabel={`${tile.label} ${tile.value}`}
        onPress={onPress}
        className="flex-1 gap-xxs rounded-lg bg-white px-sm py-sm shadow-raised active:opacity-80"
      >
        {tile.icon}
        <Text
          className="mt-xxs text-fm-display text-foreground"
          numberOfLines={1}
        >
          {tile.value}
        </Text>
        <Text className="text-fm-caption text-foreground-muted">
          {tile.label}
        </Text>
      </Pressable>
    ))}
  </View>
);
