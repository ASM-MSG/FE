import { useState, type ReactNode } from "react";
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
  /**
   * 텍스트 대신 아이콘·일러스트로 폴백할 때 (예: 사람 실루엣 기본 프로필 이미지).
   * 지정하면 `fallback` 텍스트 대신 이것이 렌더된다 — **미지정 시 렌더는 완전히 종전과 같다**.
   * RN Image는 번들 에셋을 `require()` 소스로만 받아 URI 문자열인 `src`로는 넘길 수 없어
   * 열어 둔 확장점이다 (MSG-426).
   */
  fallbackIcon?: ReactNode;
  className?: string;
}

/**
 * 웹은 Radix Avatar, RN은 Image onError 폴백으로 동일 동작을 재현한다.
 *
 * @example
 * <Avatar src={user.profileUrl} alt={user.name} fallback="김" />
 * <Avatar size="sm" fallback="김" />
 * <Avatar fallbackIcon={<User size={28} color={semantic.muted} />} />
 */
export const Avatar = ({
  size = "lg",
  src,
  alt,
  fallback,
  fallbackIcon,
  className,
}: AvatarProps) => {
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
        (fallbackIcon ?? (
          <Text className="text-fm-label text-foreground-muted">
            {fallback}
          </Text>
        ))
      )}
    </View>
  );
};
