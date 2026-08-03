import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

interface AppHeaderProps {
  title: string;
  /** 지정하면 좌측 뒤로가기 버튼 표시 */
  onBack?: () => void;
  /** 우측 슬롯 (없으면 타이틀 중앙 정렬용 스페이서) */
  right?: ReactNode;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap AppHeader" (node 13406:709) — 앱 화면 헤더 (h 48).
 *
 * @example
 * <AppHeader title="화면 타이틀" onBack={() => router.back()} />
 */
export const AppHeader = ({ title, onBack, right, className }: AppHeaderProps) => (
  <View
    className={cx(
      "h-12 w-full flex-row items-center gap-md border-b border-border bg-background px-lg",
      className,
    )}
  >
    {onBack ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
        onPress={onBack}
        className="size-4 items-center justify-center"
      >
        <ChevronLeft size={16} color={semantic.textPrimary} />
      </Pressable>
    ) : (
      <View className="size-4" />
    )}
    <Text
      accessibilityRole="header"
      numberOfLines={1}
      className="flex-1 text-center text-fm-heading text-foreground"
    >
      {title}
    </Text>
    <View className="size-4 items-center justify-center">{right}</View>
  </View>
);
