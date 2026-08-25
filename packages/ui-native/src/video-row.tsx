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
    // onPress가 없으면 role을 비운다 — 눌러도 아무 일이 없는 "버튼"을 스크린리더에
    // 노출하지 않기 위함. `video-card`와 같은 규칙이다 (MSG-446 기준 11: 이 파일만
    // 무조건 button이라 목적지 없는 목록에서도 버튼으로 낭독되고 있었다)
    accessibilityRole={onPress ? "button" : undefined}
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
