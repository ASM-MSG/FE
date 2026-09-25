import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";

/**
 * SOURCE: Figma A-2 tile (167×148 r22, shadow) — 영상 확보 경로 타일 2종(카메라·갤러리).
 * 누르면 각각 네이티브 카메라·갤러리로 간다(호출부가 결정). 아이콘 원의 톤만 다르다:
 * primary(카메라, 주 행동) / soft(갤러리, 보조).
 */
interface UploadSourceTileProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  tone: "primary" | "soft";
  onPress: () => void;
}

export const UploadSourceTile = ({
  title,
  subtitle,
  icon,
  tone,
  onPress,
}: UploadSourceTileProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityHint={subtitle}
    onPress={onPress}
    className="flex-1 rounded-xl border border-border bg-white p-md shadow-modal active:opacity-80"
  >
    <View
      className={cx(
        "size-14 items-center justify-center rounded-full",
        tone === "primary" ? "bg-primary" : "bg-primary/10",
      )}
    >
      {icon}
    </View>
    <Text className="mt-md text-fm-heading font-semibold text-foreground">
      {title}
    </Text>
    <Text className="mt-0.5 text-fm-caption text-foreground-muted">
      {subtitle}
    </Text>
  </Pressable>
);
