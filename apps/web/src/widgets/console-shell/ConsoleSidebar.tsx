import { cn } from "@fillmap/ui-web";
import type { ConsoleNavItem } from "./console-nav";

interface ConsoleSidebarProps {
  /** 콘솔 제목 — 고정 텍스트 ("행사 운영자 콘솔"·"관리자 콘솔") */
  title: string;
  items: ConsoleNavItem[];
  /** 현재 경로의 활성 항목 key (activeConsoleNavKey 결과) */
  activeKey?: string;
  onSelect: (path: string) => void;
}

/**
 * SOURCE: Figma "[v2] [행사 운영자 2] 홈·신청 현황" (15525:8652) · "[v2] [관리자 2] 행사 심사 큐"
 * (15525:9124)의 좌측 사이드바 — 콘솔 제목 + 메뉴 목록(활성 항목 강조).
 *
 * 콘솔이라는 도메인을 아는 컴포넌트라 ui-web이 아니라 widgets에 둔다(디자인 시스템 3조).
 * 제목은 heading이 아니라 문단이다 — 본문(ConsoleStub 등)의 `<h1>`보다 DOM에서 앞서므로
 * heading으로 만들면 문서 개요가 h2 → h1 순서로 뒤집힌다. 대신 `<nav>`의 접근 가능한
 * 이름에 콘솔 이름을 싣는다.
 *
 * 조직명·이메일·"ORG 계정" 뱃지·하단 "행사 등록 권한" 카드는 실데이터가 필요해
 * 후속(MSG-544·545) 범위다 (MSG-541 추정 6) — 시안의 예시 값을 하드코딩하지 않는다.
 */
export const ConsoleSidebar = ({
  title,
  items,
  activeKey,
  onSelect,
}: ConsoleSidebarProps) => (
  <aside className="flex w-70 shrink-0 flex-col gap-lg border-r border-border bg-background px-md py-lg">
    <p className="px-sm text-fm-title text-primary">{title}</p>
    <nav aria-label={`${title} 메뉴`} className="flex flex-col gap-xxs">
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSelect(item.path)}
            className={cn(
              "rounded-sm px-sm py-sm text-left text-fm-base transition-colors",
              isActive
                ? "bg-primary/10 font-medium text-primary"
                : "text-foreground-body hover:bg-surface",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  </aside>
);
