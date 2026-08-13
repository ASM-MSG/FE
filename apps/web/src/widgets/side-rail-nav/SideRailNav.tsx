import { Home, LayoutGrid, MapPin, Upload, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { SideRail, type SideRailItem } from "@fillmap/ui-web";
import { ROUTES, getActiveNavKey, isNavKey, type NavKey } from "@/app/routes";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";

// 탐색 메뉴는 MSG-328에서 제거 — 지역 탐색·검색이 홈 좌측 패널로 통합됐다 (AC 1)
const items: (SideRailItem & { key: NavKey })[] = [
  { key: "home", label: "홈", icon: <Home className="size-full" /> },
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
  const openUploadModal = useUploadModalStore((s) => s.openModal);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginModal = useLoginModalStore((s) => s.openModal);

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
        // 로그아웃 상태의 프로필은 이동 대신 로그인 모달을 연다 (URL 불변) — MSG-46 후속 2 G1.
        // 활성 탭 토글보다 앞에 둔다 — 로그아웃 직후 /profile에 머문 상태에서
        // 프로필 재클릭이 접기 토글로 빠지면 데모 흐름이 끊긴다 (후속 1 결정 유지)
        if (key === "profile" && !isAuthenticated) {
          openLoginModal();
          return;
        }
        // 업로드는 페이지 이동 대신 모달을 연다 (URL 불변) — AC1
        if (key === "upload") {
          openUploadModal();
          return;
        }
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
