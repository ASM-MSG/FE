import { useState } from "react";
import { Image, Text, View } from "react-native";
import type { AvatarBaseProps, AvatarSize } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

/** SOURCE: Figma "FeelMap Avatar" (node 13430:714) — Size lg/md/sm = 48/36/28px */
const sizeClass: Record<AvatarSize, string> = {
  lg: "size-12",
  md: "size-9",
  sm: "size-7",
};

interface AvatarProps extends AvatarBaseProps {
  src?: string;
  alt?: string;
  /** 이미지 로드 실패/미지정 시 보여줄 짧은 텍스트 (예: 이니셜) */
  fallback?: string;
  className?: string;
}

/**
 * 웹은 Radix Avatar, RN은 Image onError 폴백으로 동일 동작을 재현한다.
 *
 * @example
 * <Avatar src={user.profileUrl} alt={user.name} fallback="김" />
 * <Avatar size="sm" fallback="김" />
 */
export const Avatar = ({ size = "lg", src, alt, fallback, className }: AvatarProps) => {
  const [errored, setErrored] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setErrored(false);
  }
  const showImage = !!src && !errored;

  return (
    <View
      className={cx(
        "items-center justify-center overflow-hidden rounded-full bg-surface",
        sizeClass[size],
        className,
      )}
    >
      {showImage ? (
        <Image
          source={{ uri: src }}
          alt={alt}
          resizeMode="cover"
          className="size-full"
          onError={() => setErrored(true)}
        />
      ) : (
        <Text className="text-fm-label text-foreground-muted">{fallback}</Text>
      )}
    </View>
  );
};
