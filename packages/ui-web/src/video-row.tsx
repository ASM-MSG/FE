import type { ButtonHTMLAttributes } from "react";
import { cn } from "./lib/utils";

interface VideoRowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  /** 메타 텍스트 (예: "조회 214 · 어제") */
  meta?: string;
  thumbnailSrc?: string;
}

/**
 * SOURCE: Figma "FeelMap VideoRow" (node 13431:704) — 영상 리스트 행 (썸네일 88×56).
 *
 * @example
 * <VideoRow title="홍대 거리 야경 감성" meta="조회 214 · 어제" thumbnailSrc={url} onClick={open} />
 */
export const VideoRow = ({
  title,
  meta,
  thumbnailSrc,
  className,
  type = "button",
  ...props
}: VideoRowProps) => (
  <button
    type={type}
    className={cn(
      "flex w-full items-center gap-sm text-left transition-colors active:bg-surface",
      className,
    )}
    {...props}
  >
    {thumbnailSrc ? (
      <img
        src={thumbnailSrc}
        alt=""
        className="h-[56px] w-[88px] shrink-0 rounded-sm bg-surface object-cover"
      />
    ) : (
      <span className="h-[56px] w-[88px] shrink-0 rounded-sm bg-surface" />
    )}
    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <span className="truncate text-fm-body-strong text-foreground">
        {title}
      </span>
      {meta && (
        <span className="truncate text-fm-caption text-foreground-muted">
          {meta}
        </span>
      )}
    </span>
  </button>
);
