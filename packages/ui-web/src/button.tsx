import type { ButtonHTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import type { ButtonBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

/**
 * SOURCE: Figma Button 컴포넌트 셋 (node 13021:535)
 * 와이어프레임의 placeholder 색은 FeelMap 시맨틱 토큰으로 매핑했다 (사용자 확인 완료).
 * min-w, py-[6px] 등은 컴포넌트 고유 치수 — variant 정의 안에서만 허용 (규칙 1).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "text-fm-base text-muted-foreground underline underline-offset-2 hover:text-foreground",
        "default-active": "text-fm-base font-bold text-foreground",
        primary:
          "min-w-[60px] rounded-sm bg-primary px-md py-xs text-fm-base font-medium text-primary-foreground hover:bg-primary/90",
        secondary:
          "min-w-[60px] rounded-sm border border-foreground bg-background px-md py-xs text-fm-base font-medium text-foreground hover:bg-surface",
        danger:
          "min-w-[60px] rounded-sm bg-error/15 px-md py-xs text-fm-base font-medium text-error hover:bg-error/25",
        chip: "min-w-[40px] rounded-full border border-border bg-surface px-sm py-[6px] text-fm-base font-medium text-foreground hover:bg-gray-200",
        "chip-active":
          "min-w-[40px] rounded-full bg-foreground px-sm py-[6px] text-fm-base font-medium text-background",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface ButtonProps
  extends ButtonBaseProps,
    ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
}

/**
 * 공용 Button. variant는 Figma Button 컴포넌트의 Variant 속성과 1:1.
 *
 * @example
 * <Button text="저장" variant="primary" onClick={onSave} />
 * <Button text="전체" variant="chip-active" />
 */
export const Button = ({
  text,
  variant,
  className,
  type = "button",
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={cn(buttonVariants({ variant }), className)}
    {...props}
  >
    {text}
  </button>
);

export { buttonVariants };
