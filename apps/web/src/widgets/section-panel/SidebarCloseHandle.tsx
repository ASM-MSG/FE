import { ChevronLeft } from "lucide-react";

interface SidebarCloseHandleProps {
  /** 패널 닫기 — 지도(홈)를 넓게 보여준다 */
  onClose: () => void;
}

/**
 * 사이드바 우측 가장자리에 붙는 접기 핸들 — 클릭 시 패널을 닫아 지도를 넓게 보여준다.
 * 네비 아이콘을 다시 눌러도 같은 닫기 동작을 한다(SideRailNav의 활성 아이콘 토글).
 */
export const SidebarCloseHandle = ({ onClose }: SidebarCloseHandleProps) => (
  <button
    type="button"
    onClick={onClose}
    aria-label="사이드바 닫기"
    className="absolute right-0 top-1/2 z-20 flex h-12 w-6 -translate-y-1/2 translate-x-full items-center justify-center rounded-r-md border border-l-0 border-border bg-background text-icon shadow-raised transition-colors active:bg-surface"
  >
    <ChevronLeft className="size-4" />
  </button>
);
