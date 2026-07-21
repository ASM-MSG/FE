import type { ButtonHTMLAttributes } from "react";
import { ChevronLeft, Locate } from "lucide-react";
import { cva } from "class-variance-authority";
import type { MapIconButtonBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

/**
 * SOURCE: Figma "FeelMap MapIconButton" (node 13404:693) — 지도 위 아이콘 버튼 (40px).
 * back은 배경 없는 아이콘, locate는 흰 원형 + Raised 그림자.
 */
const mapIconButtonVariants = cva(
  "flex size-10 items-center justify-center rounded-full transition-[filter,background-color] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      icon: {
        back: "text-foreground active:bg-surface",
        locate:
          "bg-surface-elevated text-foreground shadow-raised active:brightness-[0.86]",
      },
    },
    defaultVariants: { icon: "back" },
  },
);

interface MapIconButtonProps
  extends MapIconButtonBaseProps,
    ButtonHTMLAttributes<HTMLButtonElement> {}

/**
 * @example
 * <MapIconButton icon="locate" onClick={moveToMyLocation} />
 */
export const MapIconButton = ({
  icon = "back",
  className,
  type = "button",
  ...props
}: MapIconButtonProps) => (
  <button
    type={type}
    aria-label={icon === "back" ? "뒤로 가기" : "내 위치"}
    className={cn(mapIconButtonVariants({ icon }), className)}
    {...props}
  >
    {icon === "back" ? (
      <ChevronLeft className="size-5.5" />
    ) : (
      <Locate className="size-5" />
    )}
  </button>
);
