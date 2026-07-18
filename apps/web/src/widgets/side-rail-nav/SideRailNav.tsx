import { Compass, Home, LayoutGrid, MapPin, Upload, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SideRail, type SideRailItem } from "@fillmap/ui-web";
import { ROUTES, getActiveNavKey, isNavKey, type NavKey } from "@/app/routes";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";

const items: (SideRailItem & { key: NavKey })[] = [
  { key: "home", label: "홈", icon: <Home className="size-full" /> },
  { key: "explore", label: "탐색", icon: <Compass className="size-full" /> },
  { key: "upload", label: "업로드", icon: <Upload className="size-full" /> },
  { key: "dex", label: "도감", icon: <LayoutGrid className="size-full" /> },
  { key: "profile", label: "프로필", icon: <User className="size-full" /> },
];

/**
 * SideRail(ui-web)에 라우터를 연결한 조립 위젯 — 경로 기준 활성 표시 + 클릭 시 이동.
 * 활성 탭 아이콘을 다시 누르면 사이드바를 접고(지도 전체), 다른 탭은 이동하며 펼친다(구글맵식).
 */
export const SideRailNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);
  const toggle = useSidebarStore((s) => s.toggle);

  return (
    <SideRail
      logo={
        <span className="flex size-full items-center justify-center bg-primary text-primary-foreground">
          <MapPin className="size-5" />
        </span>
      }
      items={items}
      activeKey={getActiveNavKey(pathname)}
      onSelect={(key) => {
        if (!isNavKey(key)) return;
        // 활성 탭 재클릭 → 접기/펼치기 토글, 다른 탭 → 이동하며 펼침
        if (key === getActiveNavKey(pathname)) {
          toggle();
          return;
        }
        setCollapsed(false);
        navigate(ROUTES[key]);
      }}
    />
  );
};
