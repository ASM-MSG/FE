import type { InputHTMLAttributes } from "react";
import type { InputBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

interface InputProps
  extends InputBaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {}

/**
 * SOURCE: Figma "FeelMap Input" (node 13429:695) — 텍스트 입력.
 * State=focus는 focus: 인터랙션, State=filled는 값 유무로 자연 처리, State=error만 prop.
 *
 * @example
 * <Input placeholder="내용을 입력하세요" />
 * <Input error value={value} onChange={onChange} />
 */
export const Input = ({ error, className, ...props }: InputProps) => (
  <input
    aria-invalid={error || undefined}
    className={cn(
      "h-[48px] w-full rounded-md border-[1.5px] border-transparent bg-background px-md text-fm-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary disabled:pointer-events-none disabled:opacity-50",
      error && "border-error focus:border-error",
      className,
    )}
    {...props}
  />
);
