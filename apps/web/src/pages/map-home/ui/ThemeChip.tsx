import type { LucideIcon } from "lucide-react";
import { cn } from "@fillmap/ui-web";

interface ThemeChipProps {
  label: string;
  icon: LucideIcon;
  active: boolean;
  /** 활성 배경 토큰 클래스 (예: "bg-theme-hot") — 테마별 리터럴 매핑은 ThemeChipsBar 소관 */
  activeBgClassName: string;
  /** 비활성 아이콘 색 토큰 클래스 (예: "text-theme-hot") — "컬러 아이콘" (AC 2) */
  iconClassName: string;
  onClick: () => void;
}

/**
 * 테마 필터 칩 (MSG-252 AC 1~3) — Figma 지도 홈 상단 칩(node 13845:6974 계열).
 * 공용 ui-web `Chip`은 active 시 Check 아이콘 강제 + primary 단색이라 이 디자인
 * (활성 시에도 고유 아이콘 유지 + 테마 4색)에 못 쓴다 → 로컬 (스펙 재사용 불가 판정,
 * Figma 오탐 방지 7). 변형 수요가 재발하면 ui-web 승격 후보다.
 */
export const ThemeChip = ({
  label,
  icon: Icon,
  active,
  activeBgClassName,
  iconClassName,
  onClick,
}: ThemeChipProps) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      // 높이는 고정값으로 잡는다 (사용자 지정 38px) — py-xs(8) + 본문 17 = 33이라 너무
      // 납작했다. 세로 패딩으로 맞추면 글꼴 줄높이가 바뀔 때 높이가 같이 흔들린다
      "flex h-9.5 items-center gap-xxs rounded-full px-sm text-fm-body-strong shadow-raised transition-colors",
      active
        ? cn("text-primary-foreground", activeBgClassName)
        : "bg-background text-foreground",
    )}
  >
    <Icon
      className={cn(
        "size-4",
        active ? "text-primary-foreground" : iconClassName,
      )}
      aria-hidden="true"
    />
    {label}
  </button>
);
