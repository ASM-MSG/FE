import { Compass, Home, LayoutGrid, MapPin, Upload, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SideRail, type SideRailItem } from "@fillmap/ui-web";
import { ROUTES, getActiveNavKey, isNavKey, type NavKey } from "@/app/routes";

const items: (SideRailItem & { key: NavKey })[] = [
  { key: "home", label: "홈", icon: <Home className="size-full" /> },
  { key: "explore", label: "탐색", icon: <Compass className="size-full" /> },
  { key: "upload", label: "업로드", icon: <Upload className="size-full" /> },
  { key: "dex", label: "도감", icon: <LayoutGrid className="size-full" /> },
  { key: "profile", label: "프로필", icon: <User className="size-full" /> },
];

/** SideRail(ui-web)에 라우터를 연결한 조립 위젯 — 경로 기준 활성 표시 + 클릭 시 이동 */
export const SideRailNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

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
        // 탐색을 다시 누르면 패널을 닫는다 — 홈으로 복귀(S10)
        if (key === "explore" && getActiveNavKey(pathname) === "explore") {
          navigate(ROUTES.home);
          return;
        }
        navigate(ROUTES[key]);
      }}
    />
  );
};
