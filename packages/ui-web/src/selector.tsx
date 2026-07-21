import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { cva } from "class-variance-authority";
import type { SelectorBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

/**
 * SOURCE: Figma "FeelMap Selector" (node 13430:703) — 체크박스/라디오 (20×20).
 * 두 타입 모두 Radix Checkbox 기반의 단일 on/off 토글로 구현한다 —
 * 라디오의 그룹 배타 선택은 사용하는 쪽에서 조합한다.
 */
const selectorVariants = cva(
  "inline-flex size-5 shrink-0 items-center justify-center border-[1.5px] border-border bg-surface transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      type: {
        checkbox:
          "rounded-xs data-[state=checked]:border-transparent data-[state=checked]:bg-primary",
        radio:
          "rounded-full data-[state=checked]:border-[6px] data-[state=checked]:border-primary data-[state=checked]:bg-background",
      },
    },
    defaultVariants: { type: "checkbox" },
  },
);

interface SelectorProps extends SelectorBaseProps {
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  className?: string;
}

/**
 * @example
 * <Selector checked={agreed} onCheckedChange={setAgreed} />
 * <Selector type="radio" checked={value === "a"} onCheckedChange={() => setValue("a")} />
 */
export const Selector = ({
  type = "checkbox",
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  id,
  className,
}: SelectorProps) => (
  <CheckboxPrimitive.Root
    id={id}
    checked={checked}
    defaultChecked={defaultChecked}
    disabled={disabled}
    onCheckedChange={(value) => onCheckedChange?.(value === true)}
    className={cn(selectorVariants({ type }), className)}
  >
    {type === "checkbox" && (
      <CheckboxPrimitive.Indicator className="text-primary-foreground">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    )}
  </CheckboxPrimitive.Root>
);
