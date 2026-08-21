import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "./lib/utils";

interface FabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 아이콘 슬롯. 기본 + */
  icon?: ReactNode;
}

/**
 * SOURCE: Figma "FeelMap FAB" (node 13431:697) — 기록/업로드 플로팅 버튼 (56px).
 *
 * @example
 * <Fab aria-label="기록하기" onClick={onRecord} />
 */
export const Fab = ({
  icon,
  className,
  type = "button",
  ...props
}: FabProps) => (
  <button
    type={type}
    className={cn(
      "flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab transition-[filter] active:brightness-[0.86] disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {icon ?? <Plus className="size-5" strokeWidth={3} />}
  </button>
);
