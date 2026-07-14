import type { ReactNode } from "react";
import { cn } from "./lib/utils";

export interface SideRailItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface SideRailProps {
  items: SideRailItem[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  /** 상단 로고 슬롯 (40×40) */
  logo?: ReactNode;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap SideRail v3" (node 13288:527) — 웹 사이드 내비 (w 72).
 * 로고/아이콘/라벨은 도메인이므로 슬롯과 items로 주입한다.
 *
 * @example
 * <SideRail
 *   logo={<img src={logoUrl} alt="FillMap" />}
 *   items={[{ key: "home", label: "홈", icon: <Home /> }, ...]}
 *   activeKey="home"
 *   onSelect={navigate}
 * />
 */
export const SideRail = ({
  items,
  activeKey,
  onSelect,
  logo,
  className,
}: SideRailProps) => (
  <nav
    className={cn(
      "flex h-full w-[72px] flex-col items-center gap-xs border-r border-border bg-background py-md",
      className,
    )}
  >
    {logo && (
      <div className="mb-sm flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-md">
        {logo}
      </div>
    )}
    {items.map((item) => {
      const isActive = item.key === activeKey;
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect?.(item.key)}
          className={cn(
            "flex size-[56px] shrink-0 flex-col items-center justify-center gap-xxs rounded-md transition-colors",
            isActive
              ? "bg-surface text-primary"
              : "text-foreground-body active:bg-surface",
          )}
        >
          <span className="flex size-[22px] items-center justify-center">
            {item.icon}
          </span>
          <span className="text-fm-caption font-medium">{item.label}</span>
        </button>
      );
    })}
  </nav>
);
