import { useState } from "react";
import { cn } from "./lib/utils";

interface ThumbnailProps {
  /**
   * 썸네일 URL — null이면 기본 이미지 폴백. 빈 문자열도 폴백 취급한다
   * (src=""는 브라우저가 현재 페이지를 재요청하는 함정 — MSG-464 추정 4).
   */
  src: string | null;
  /** 장식 썸네일(카드가 자체 접근성 이름을 가짐)이 기본 — 생략 시 alt="" */
  alt?: string;
  loading?: "eager" | "lazy";
  /** img·폴백 어느 쪽이 렌더되든 루트에 병합된다 */
  className?: string;
}

/**
 * SOURCE: Figma "영상 기본 이미지" (node 15231:353) — 격자 로고 플레이스홀더.
 * 부모(relative 컨테이너)를 채우는 영상 썸네일 + 기본 이미지 폴백 (MSG-464).
 * src가 없거나(null·"") 로드에 실패하면(onError) 격자 로고 마크(인라인 SVG —
 * 라운드 2×2 격자, 한 칸에 재생 삼각형)를 중앙에 렌더한다. 배경 회색은 컨테이너의
 * `bg-surface` 몫이다. src가 다른 값으로 바뀌면 에러 상태를 리셋해 다시 시도한다.
 * ui-native `Thumbnail`과 이름·에러 리셋 계약(prevSrc 패턴)을 정렬하되 API는 플랫폼별로
 * 다르다(native: 64px 고정 + 텍스트 폴백 / web: 부모 채움 + 기본 이미지 폴백) —
 * 완전 미러가 아니므로 props는 variants.ts가 아닌 로컬 정의다 (native 선례).
 *
 * @example
 * <span className="relative aspect-video overflow-hidden rounded-sm bg-surface">
 *   <Thumbnail src={video.thumbnailUrl} />
 * </span>
 */
export const Thumbnail = ({
  src,
  alt = "",
  loading,
  className,
}: ThumbnailProps) => {
  const [errored, setErrored] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setErrored(false);
  }
  const showImage = !!src && !errored;

  if (showImage) {
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
        onError={() => setErrored(true)}
        className={cn("absolute inset-0 size-full object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        className,
      )}
    >
      {/* 격자 로고 마크 — 작은 컨테이너(size-16 등)에서는 60%로 축소 (추정 5) */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="size-16 max-h-[60%] max-w-[60%]"
      >
        {/* 좌상단 채움 칸 (외곽 라운드에 맞춘 코너) */}
        <path
          d="M32 2H16C8.268 2 2 8.268 2 16v16h30V2Z"
          className="fill-current text-foreground-muted"
        />
        {/* 채움 칸 중앙의 재생 삼각형 */}
        <path
          d="m13.5 11.5 9 5.4-9 5.4v-10.8Z"
          className="fill-current text-foreground-inverse"
        />
        {/* 외곽 라운드 사각 + 2×2 격자선 */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="14"
          strokeWidth="3"
          className="stroke-current text-hairline-strong"
        />
        <path
          d="M32 2v60M2 32h60"
          strokeWidth="3"
          className="stroke-current text-hairline-strong"
        />
      </svg>
    </span>
  );
};
