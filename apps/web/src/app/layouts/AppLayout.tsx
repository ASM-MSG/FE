import { Outlet } from "react-router-dom";
import { SideRailNav } from "@/widgets/side-rail-nav/SideRailNav";

/** 웹 공통 셸 — 좌측 SideRail 고정, 나머지 영역에 페이지(Outlet) 렌더링 */
export const AppLayout = () => (
  <div className="flex h-dvh bg-background">
    <SideRailNav />
    <main className="flex-1 overflow-y-auto">
      <Outlet />
    </main>
  </div>
);
