import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebarStore } from "./sidebar-store";

/**
 * 셸 레벨 접기/펼치기 핸들 — 어떤 섹션 패널에도 공통으로 붙는다.
 * 펼침: 패널 우측 가장자리(388px)에서 ‹ 로 접기. 접힘: 레일 옆(0px)에서 › 로 펼치기.
 * 네비 아이콘 재클릭과 동일한 collapsed 토글을 조작한다.
 */
export const SidebarCollapseHandle = () => {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "사이드바 열기" : "사이드바 닫기"}
      aria-expanded={!collapsed}
      className={`absolute top-1/2 z-30 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border bg-background text-icon shadow-raised transition-[left] duration-200 active:bg-surface ${
        collapsed ? "left-0" : "left-97"
      }`}
    >
      {collapsed ? (
        <ChevronRight className="size-4" />
      ) : (
        <ChevronLeft className="size-4" />
      )}
    </button>
  );
};
