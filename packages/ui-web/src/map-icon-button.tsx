import type { ButtonHTMLAttributes } from "react";
import { ChevronLeft, Locate, Minus, Plus } from "lucide-react";
import { cva } from "class-variance-authority";
import type {
  MapIconButtonBaseProps,
  MapIconButtonIcon,
} from "@fillmap/design-tokens";
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
        // zoom-in·zoom-out은 MSG-601(모바일)에서 토큰 union에 추가 — 웹 소비처는 아직 없고
        // locate와 같은 흰 원형 규격을 공유한다(토큰 Record 완전성 유지)
        "zoom-in":
          "bg-surface-elevated text-foreground shadow-raised active:brightness-[0.86]",
        "zoom-out":
          "bg-surface-elevated text-foreground shadow-raised active:brightness-[0.86]",
      },
    },
    defaultVariants: { icon: "back" },
  },
);

interface MapIconButtonProps
  extends MapIconButtonBaseProps, ButtonHTMLAttributes<HTMLButtonElement> {}

const ariaLabel: Record<MapIconButtonIcon, string> = {
  back: "뒤로 가기",
  locate: "내 위치",
  "zoom-in": "지도 확대",
  "zoom-out": "지도 축소",
};

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
    aria-label={ariaLabel[icon]}
    className={cn(mapIconButtonVariants({ icon }), className)}
    {...props}
  >
    {icon === "back" ? (
      <ChevronLeft className="size-5.5" />
    ) : icon === "zoom-in" ? (
      <Plus className="size-5" />
    ) : icon === "zoom-out" ? (
      <Minus className="size-5" />
    ) : (
      <Locate className="size-5" />
    )}
  </button>
);
