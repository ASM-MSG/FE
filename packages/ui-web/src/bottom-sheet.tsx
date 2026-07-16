import type { ReactNode } from "react";
import { cn } from "./lib/utils";

interface BottomSheetProps {
  title?: string;
  /** 타이틀 우측 액션 텍스트 (예: "전체 보기") */
  actionLabel?: string;
  onAction?: () => void;
  /** 드래그 핸들 표시 여부 — 웹 도킹 패널은 false (기본 true) */
  handle?: boolean;
  /** 콘텐츠 슬롯 */
  children?: ReactNode;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap BottomSheet" (node 13406:687) — 바텀시트 쉘 (앱) / 도킹 패널 헤더 (웹).
 * 프레젠테이셔널 쉘 — 드래그/스냅 동작은 사용하는 쪽(vaul 등)에서 감싼다.
 *
 * @example
 * <BottomSheet title="이 지역 격자 24개 · 영상 138개" actionLabel="전체 보기" onAction={openList}>
 *   <VideoRow ... />
 * </BottomSheet>
 */
export const BottomSheet = ({
  title,
  actionLabel,
  onAction,
  handle = true,
  children,
  className,
}: BottomSheetProps) => (
  <div
    className={cn(
      "flex w-full flex-col gap-sm rounded-t-xl bg-surface-elevated px-md pb-md shadow-sheet",
      handle ? "pt-[10px]" : "pt-md",
      className,
    )}
  >
    {handle && (
      <div className="flex justify-center">
        <span className="h-[4px] w-[36px] rounded-full bg-hairline-strong" />
      </div>
    )}
    {(title || actionLabel) && (
      <div className="flex items-center gap-xs">
        <p className="min-w-0 flex-1 text-fm-title text-foreground">{title}</p>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 text-fm-label text-primary"
          >
            {actionLabel}
          </button>
        )}
      </div>
    )}
    {children}
  </div>
);
