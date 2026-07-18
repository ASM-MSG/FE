import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/app/routes";
import { SidebarCloseHandle } from "./SidebarCloseHandle";

interface SectionPanelProps {
  title: string;
  children?: ReactNode;
}

/**
 * 네비 섹션 공통 사이드바 패널 — 지속 지도 셸(MapShell) 위에 얹히는 388px 좌측 오버레이.
 * 헤더(제목) + 본문 + 우측 접기 핸들(닫으면 홈/지도로 복귀)로 구성되며, 탐색 패널과 폭·위치를 맞춘다.
 * 업로드·도감·프로필 등 아직 전용 화면이 없는 섹션이 이 래퍼로 사이드바를 얻는다.
 */
export const SectionPanel = ({ title, children }: SectionPanelProps) => {
  const navigate = useNavigate();
  return (
    <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col bg-background shadow-raised">
      <div className="flex items-center border-b border-border p-md">
        <h1 className="text-fm-heading text-foreground">{title}</h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-md">
        {children ?? (
          <p className="text-fm-body text-foreground-muted">
            준비 중인 페이지예요
          </p>
        )}
      </div>
      <SidebarCloseHandle onClose={() => navigate(ROUTES.home)} />
    </aside>
  );
};
