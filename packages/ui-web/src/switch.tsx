import { Switch as SwitchPrimitive } from "radix-ui";
import type { SwitchBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

interface SwitchProps extends SwitchBaseProps {
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap Switch" (node 13430:695) — 토글 (36×20).
 * Radix Switch 기반 (shadcn 패턴).
 *
 * @example
 * <Switch checked={enabled} onCheckedChange={setEnabled} />
 */
export const Switch = ({
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  id,
  className,
}: SwitchProps) => (
  <SwitchPrimitive.Root
    id={id}
    checked={checked}
    defaultChecked={defaultChecked}
    disabled={disabled}
    onCheckedChange={onCheckedChange}
    className={cn(
      "inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-border p-0.5 transition-colors data-[state=checked]:bg-primary disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
  >
    <SwitchPrimitive.Thumb className="block size-4 rounded-full bg-background shadow-raised transition-transform data-[state=checked]:translate-x-4" />
  </SwitchPrimitive.Root>
);
