import type { ReactNode } from "react";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";

interface SectionPanelProps {
  title: string;
  children?: ReactNode;
}

/**
 * 네비 섹션 공통 사이드바 패널 — 지속 지도 셸(MapShell) 위에 얹히는 388px 좌측 오버레이.
 * 헤더(제목) + 본문으로 구성되며, 탐색·홈 패널과 폭·위치를 맞춘다. 접기/펼치기는 셸의
 * 공통 핸들(SidebarCollapseHandle)이 담당하므로 패널마다 닫기 컨트롤을 두지 않는다.
 * 업로드·도감·프로필 등 아직 전용 화면이 없는 섹션이 이 래퍼로 사이드바를 얻는다.
 * 패널 제목이 곧 탭 제목("{제목} | 필맵")이다 (MSG-478 C3).
 */
export const SectionPanel = ({ title, children }: SectionPanelProps) => {
  useDocumentTitle(formatDocumentTitle(title));

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
    </aside>
  );
};
