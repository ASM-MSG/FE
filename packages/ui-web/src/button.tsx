import type { ButtonHTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import type { ButtonBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

/**
 * SOURCE: Figma "FeelMap Button" (node 13427:723)
 * State=pressed(14% 검정 오버레이)는 active:brightness-[0.86]으로 재현 — 채널×0.86과 동일한 결과.
 * h/min-w 값은 컴포넌트 고유 치수 — variant 정의 안에서만 허용 (규칙 1).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center font-semibold transition-[filter,background-color] active:brightness-[0.86] disabled:pointer-events-none disabled:bg-background disabled:text-foreground-muted",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-background text-foreground",
        danger: "bg-error text-primary-foreground",
      },
      size: {
        lg: "h-12 min-w-35 rounded-md px-lg text-fm-title leading-none",
        sm: "h-9 min-w-26 rounded-sm px-md text-fm-body-strong",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

interface ButtonProps
  extends ButtonBaseProps, ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
}

/**
 * 공용 Button. variant/size는 Figma Button 컴포넌트의 Variant 속성과 1:1.
 *
 * @example
 * <Button text="저장" variant="primary" onClick={onSave} />
 * <Button text="삭제" variant="danger" size="sm" />
 */
export const Button = ({
  text,
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={cn(buttonVariants({ variant, size }), className)}
    {...props}
  >
    {text}
  </button>
);

export { buttonVariants };
