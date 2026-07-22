import type { ButtonHTMLAttributes } from "react";
import { Check } from "lucide-react";
import type { ChipBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

interface ChipProps
  extends ChipBaseProps,
    ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
}

/**
 * SOURCE: Figma "FeelMap Chip" (node 13428:693) — 필터/정렬 칩.
 * State=active는 boolean prop, State=pressed는 active: 인터랙션으로 처리.
 *
 * @example
 * <Chip text="부산진구" active onClick={onToggle} />
 */
export const Chip = ({
  text,
  active = false,
  className,
  type = "button",
  ...props
}: ChipProps) => (
  <button
    type={type}
    aria-pressed={active}
    className={cn(
      "inline-flex h-8 items-center gap-xxs rounded-full px-3.5 text-fm-label transition-[filter,background-color] active:brightness-[0.86] disabled:pointer-events-none disabled:opacity-50",
      active
        ? "bg-primary text-primary-foreground"
        : "bg-background text-foreground",
      className,
    )}
    {...props}
  >
    {active && <Check className="size-3" strokeWidth={3} />}
    {text}
  </button>
);
