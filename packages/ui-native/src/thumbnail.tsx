import { useState } from "react";
import { Image, Text, View } from "react-native";
import { cx } from "./lib/cx";

/**
 * SOURCE: Figma "Image" (node 14094:3974) — Shape=square/round, 64px 썸네일.
 * 앱 전용 컴포넌트 — 웹 대응이 없어 props 타입을 variants.ts가 아닌
 * 여기(로컬)에 정의한다 (스펙 A5).
 */
export type ThumbnailShape = "square" | "round";

const shapeClass: Record<ThumbnailShape, string> = {
  square: "rounded-md",
  round: "rounded-full",
};

interface ThumbnailProps {
  /** 기본 "square" */
  shape?: ThumbnailShape;
  src?: string;
  alt?: string;
  /** 이미지 로드 실패/미지정 시 중앙에 표시할 짧은 텍스트 */
  fallback?: string;
  className?: string;
}

/**
 * @example
 * <Thumbnail src={video.thumbnailUrl} alt="격자 썸네일" />
 * <Thumbnail shape="round" fallback="서면" />
 */
export const Thumbnail = ({
  shape = "square",
  src,
  alt,
  fallback,
  className,
}: ThumbnailProps) => {
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
        "size-16 items-center justify-center overflow-hidden bg-surface",
        shapeClass[shape],
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
