import { Minus, Plus } from "lucide-react";
import { cn } from "./lib/utils";

interface ZoomControlProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap ZoomControl" (node 13135:541) — 웹 지도 줌 컨트롤 (40×96).
 *
 * @example
 * <ZoomControl onZoomIn={zoomIn} onZoomOut={zoomOut} />
 */
export const ZoomControl = ({
  onZoomIn,
  onZoomOut,
  className,
}: ZoomControlProps) => (
  <div
    className={cn(
      "flex w-10 flex-col items-center overflow-hidden rounded-md bg-background shadow-raised",
      className,
    )}
  >
    <button
      type="button"
      aria-label="확대"
      onClick={onZoomIn}
      className="flex h-11 w-full items-center justify-center text-icon transition-colors active:bg-surface"
    >
      <Plus className="size-4" />
    </button>
    <span className="h-px w-6 shrink-0 bg-border" />
    <button
      type="button"
      aria-label="축소"
      onClick={onZoomOut}
      className="flex h-11 w-full items-center justify-center text-icon transition-colors active:bg-surface"
    >
      <Minus className="size-4" />
    </button>
  </div>
);
