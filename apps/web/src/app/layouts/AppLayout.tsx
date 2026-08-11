import { Outlet } from "react-router-dom";
import { LoginModal } from "@/features/auth/ui/LoginModal";
import { UploadModal } from "@/features/upload/ui/UploadModal";
import { UploadProcessingNotices } from "@/features/upload/ui/UploadProcessingNotices";
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
    {/* 블러 처리 폴링 워처 + 통지 토스트 — 모달이 닫혀도 상주해야 한다 (MSG-329 B14~B17) */}
    <UploadProcessingNotices />
    {/* 로그아웃 상태 프로필 클릭 진입 — 업로드 모달과 동일 레벨 1회 마운트 (MSG-46 후속 2 G1) */}
    <LoginModal />
  </div>
);
