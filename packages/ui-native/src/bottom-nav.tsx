import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { Camera } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

export interface BottomNavItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface BottomNavProps {
  /** 탭 목록 — 앞 절반은 카메라 버튼 왼쪽, 뒤 절반은 오른쪽에 배치된다 */
  items: BottomNavItem[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  onCamera?: () => void;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap BottomNav" (node 13406:742) — 앱 하단 내비 (볼록 카메라, h 84).
 * 탭 아이콘/라벨은 도메인이므로 items로 주입한다.
 * RN은 아이콘 색 상속(currentColor)이 없으므로 활성 상태별 아이콘 색은
 * 사용하는 쪽에서 activeKey에 맞춰 지정한다.
 *
 * @example
 * <BottomNav
 *   items={[{ key: "home", label: "홈", icon: <MapIcon color={...} /> }, ...]}
 *   activeKey="home"
 *   onSelect={setTab}
 *   onCamera={openCamera}
 * />
 */
export const BottomNav = ({
  items,
  activeKey,
  onSelect,
  onCamera,
  className,
}: BottomNavProps) => {
  const mid = Math.ceil(items.length / 2);

  const renderTab = (item: BottomNavItem) => {
    const isActive = item.key === activeKey;
    return (
      <Pressable
        key={item.key}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        onPress={() => onSelect?.(item.key)}
        className="flex-1 items-center justify-center gap-xxs"
      >
        <View className="size-5.5 items-center justify-center">
          {item.icon}
        </View>
        <Text
          className={cx(
            "text-fm-caption",
            isActive
              ? "font-semibold text-primary"
              : "font-medium text-foreground-muted",
          )}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className={cx("relative h-21 w-full", className)}>
      <View className="absolute inset-x-0 bottom-0 h-16 flex-row border-t border-border bg-background">
        {items.slice(0, mid).map(renderTab)}
        <View className="w-19.5" />
        {items.slice(mid).map(renderTab)}
      </View>
      <View className="absolute inset-x-0 top-0 items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="카메라"
          onPress={onCamera}
          className="size-15 items-center justify-center rounded-full border-4 border-background bg-primary shadow-fab active:opacity-80"
        >
          <Camera size={24} color={semantic.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
};
