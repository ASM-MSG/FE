import type { ReactNode } from "react";
import { Camera } from "lucide-react";
import { cn } from "./lib/utils";

export interface BottomNavItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface BottomNavProps {
  /** 탭 목록 — 앞 절반은 카메라 버튼 왼쪽, 뒤 절반은 오른쪽에 배치된다 */
  items: BottomNavItem[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  onCamera?: () => void;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap BottomNav" (node 13406:742) — 앱 하단 내비 (볼록 카메라, h 84).
 * 탭 아이콘/라벨은 도메인이므로 items로 주입한다.
 *
 * @example
 * <BottomNav
 *   items={[{ key: "home", label: "홈", icon: <Home /> }, ...]}
 *   activeKey="home"
 *   onSelect={setTab}
 *   onCamera={openCamera}
 * />
 */
export const BottomNav = ({
  items,
  activeKey,
  onSelect,
  onCamera,
  className,
}: BottomNavProps) => {
  const mid = Math.ceil(items.length / 2);

  const renderTab = (item: BottomNavItem) => {
    const isActive = item.key === activeKey;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => onSelect?.(item.key)}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-xxs",
          isActive ? "text-primary" : "text-foreground-muted",
        )}
      >
        <span className="flex size-[22px] items-center justify-center">
          {item.icon}
        </span>
        <span
          className={cn(
            "text-fm-caption",
            isActive ? "font-semibold" : "font-medium",
          )}
        >
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <nav className={cn("relative h-[84px] w-full", className)}>
      <div className="absolute inset-x-0 bottom-0 flex h-[64px] border-t border-border bg-background">
        {items.slice(0, mid).map(renderTab)}
        <span aria-hidden className="w-[78px] shrink-0" />
        {items.slice(mid).map(renderTab)}
      </div>
      <button
        type="button"
        aria-label="카메라"
        onClick={onCamera}
        className="absolute left-1/2 top-0 flex size-[60px] -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab ring-4 ring-background transition-[filter] active:brightness-[0.86]"
      >
        <Camera className="size-[24px]" />
      </button>
    </nav>
  );
};
