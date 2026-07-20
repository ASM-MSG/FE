import { Outlet } from "react-router-dom";
import { UploadModal } from "@/features/upload/ui/UploadModal";
import { SideRailNav } from "@/widgets/side-rail-nav/SideRailNav";

/** 웹 공통 셸 — 좌측 SideRail 고정, 나머지 영역에 페이지(Outlet) 렌더링 */
export const AppLayout = () => (
  <div className="flex h-dvh bg-background">
    <SideRailNav />
    <main className="flex-1 overflow-y-auto">
      <Outlet />
    </main>
    {/* 두 진입점(사이드레일·지도 FAB) 공통 조상에 1회 마운트 — 열림 상태는 전역 스토어 (Q2) */}
    <UploadModal />
  </div>
);
