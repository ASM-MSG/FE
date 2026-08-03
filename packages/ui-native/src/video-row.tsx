import { Image, Pressable, Text, View } from "react-native";
import { cx } from "./lib/cx";

interface VideoRowProps {
  title: string;
  /** 메타 텍스트 (예: "조회 214 · 어제") */
  meta?: string;
  thumbnailSrc?: string;
  onPress?: () => void;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap VideoRow" (node 13431:704) — 영상 리스트 행 (썸네일 88×56).
 *
 * @example
 * <VideoRow title="서면 거리 야경 감성" meta="조회 214 · 어제" thumbnailSrc={url} onPress={open} />
 */
export const VideoRow = ({
  title,
  meta,
  thumbnailSrc,
  onPress,
  className,
}: VideoRowProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    className={cx(
      "w-full flex-row items-center gap-sm active:bg-surface",
      className,
    )}
  >
    {thumbnailSrc ? (
      <Image
        source={{ uri: thumbnailSrc }}
        resizeMode="cover"
        className="h-14 w-22 rounded-sm bg-surface"
      />
    ) : (
      <View className="h-14 w-22 rounded-sm bg-surface" />
    )}
    <View className="flex-1 gap-0.75">
      <Text numberOfLines={1} className="text-fm-body-strong text-foreground">
        {title}
      </Text>
      {meta && (
        <Text
          numberOfLines={1}
          className="text-fm-caption text-foreground-muted"
        >
          {meta}
        </Text>
      )}
    </View>
  </Pressable>
);
