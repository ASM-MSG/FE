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
  /**
   * 하단 고정 슬롯 (MSG-541) — 목록 아래 남은 공간을 밀어내고 레일 바닥에 붙는다.
   * 콘솔 레일의 로그아웃 자리. 미지정 시 렌더 결과가 종전과 동일하다.
   */
  footer?: ReactNode;
  className?: string;
  /** `<nav>`의 접근 가능한 이름 — 랜드마크가 여럿일 때 스크린리더가 구분한다 (MSG-478 D3). 미지정 시 렌더 불변 */
  "aria-label"?: string;
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
  footer,
  className,
  "aria-label": ariaLabel,
}: SideRailProps) => (
  <nav
    aria-label={ariaLabel}
    className={cn(
      "flex h-full w-18 flex-col items-center gap-xs border-r border-border bg-background py-md",
      className,
    )}
  >
    {logo && (
      <div className="mb-sm flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
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
            "flex size-14 shrink-0 flex-col items-center justify-center gap-xxs rounded-md transition-colors",
            isActive
              ? "bg-surface text-primary"
              : "text-foreground-body active:bg-surface",
          )}
        >
          <span className="flex size-5.5 items-center justify-center">
            {item.icon}
          </span>
          <span className="text-fm-caption font-medium">{item.label}</span>
        </button>
      );
    })}
    {footer && <div className="mt-auto shrink-0">{footer}</div>}
  </nav>
);
