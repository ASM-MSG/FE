import { Home, LayoutGrid, MapPin, Sparkles, Upload, User } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { SideRail, type SideRailItem } from "@fillmap/ui-web";
import { ROUTES, getActiveNavKey, isNavKey, type NavKey } from "@/app/routes";
import { useAiRouteStore } from "@/features/ai-route/model/ai-route-store";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { dexTabPath, parseDexTab } from "@/features/dex/model/dex-tab";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useMissionSelectionStore } from "@/features/map-home/model/mission-selection-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useProfileModalStore } from "@/features/profile/model/profile-modal-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";
import {
  isAiRouteInitial,
  isDexInitial,
  isHomeInitial,
  isProfileInitial,
  railReclickAction,
} from "./rail-action";

// 탐색 메뉴는 MSG-328에서 제거 — 지역 탐색·검색이 홈 좌측 패널로 통합됐다 (AC 1)
const items: (SideRailItem & { key: NavKey })[] = [
  { key: "home", label: "홈", icon: <Home className="size-full" /> },
  // AI 경로추천(MSG-488) — Figma 레일 마스터 15688:810이 홈 바로 아래 sparkles로 그렸다
  {
    key: "aiRoute",
    label: "AI 경로추천",
    icon: <Sparkles className="size-full" />,
  },
  { key: "upload", label: "업로드", icon: <Upload className="size-full" /> },
  { key: "dex", label: "도감", icon: <LayoutGrid className="size-full" /> },
  { key: "profile", label: "프로필", icon: <User className="size-full" /> },
];

/**
 * SideRail(ui-web)에 라우터를 연결한 조립 위젯 — 경로 기준 활성 표시 + 클릭 시 이동.
 * 다른 탭은 이동하며 펼치고(구글맵식), **활성 탭 재클릭은 2단**이다 (MSG-403 AC 16~18):
 * 그 화면이 초기 상태가 아니면 먼저 초기 상태로 되돌리고(패널은 열어 둔 채),
 * 이미 초기 상태면 종전대로 사이드바를 접거나 편다.
 *
 * 상태 판정·초기화는 스토어를 구독하지 않고 클릭 시점에 `getState()`로 읽는다 —
 * 칩·상세·모달이 바뀔 때마다 사이드레일이 리렌더될 이유가 없다.
 */
export const SideRailNav = () => {
  const { pathname } = useLocation();
  const { tab: dexTabParam } = useParams();
  const navigate = useNavigate();
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const openUploadModal = useUploadModalStore((s) => s.openModal);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginModal = useLoginModalStore((s) => s.openModal);

  /** 그 섹션이 초기 상태인가 — 판정 규칙은 rail-action(순수 함수)이 소유한다 */
  const sectionIsInitial = (key: NavKey): boolean => {
    if (key === "home") {
      return isHomeInitial({
        activeTheme: useThemeFilterStore.getState().activeTheme,
        selectedGridId: useHomeCellDetailStore.getState().selectedCellId,
        selectedMissionId:
          useMissionSelectionStore.getState().selectedMissionId,
        miniPanelOpen: useVideoMiniPanelStore.getState().selected !== null,
        regionMode: useRegionPanelStore.getState().mode,
      });
    }
    if (key === "dex") {
      return isDexInitial({
        tab: parseDexTab(dexTabParam),
        galleryOpen: useGalleryRegionStore.getState().selected !== null,
      });
    }
    if (key === "aiRoute") {
      const { status, text } = useAiRouteStore.getState();
      return isAiRouteInitial({ status, text });
    }
    return isProfileInitial({
      modalOpen: useProfileModalStore.getState().open !== null,
    });
  };

  /** 그 섹션을 초기 상태로 되돌린다 — 패널은 닫지 않는다 */
  const resetSection = (key: NavKey): void => {
    if (key === "home") {
      // 칩 해제 + 격자·미션 상세 + 미니 패널까지 한 번에 (theme-filter-store 체인)
      useThemeFilterStore.getState().reset();
      useRegionPanelStore.getState().closeRegionList();
      return;
    }
    if (key === "dex") {
      useGalleryRegionStore.getState().clear();
      navigate(dexTabPath("map"));
      return;
    }
    if (key === "aiRoute") {
      // 입력·결과·선택을 비우되 패널은 열어 둔다 (MSG-488 S12①)
      useAiRouteStore.getState().reset();
      return;
    }
    useProfileModalStore.getState().close();
  };

  return (
    <SideRail
      aria-label="주요 메뉴"
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
        // 프로필 재클릭이 접기 토글로 빠지면 데모 흐름이 끊긴다 (후속 1 결정 유지).
        // 도감도 같은 분기다 (MSG-328 사용자 버그 리포트) — 이동을 허용하면
        // /dex → RequireAuth 홈 귀환 → MapHomePage 재마운트가 실패 쿼리(grids·hotzones
        // 401 + reissue)를 클릭마다 재발사시킨다. RequireAuth 래핑은 직접 URL 진입 방어로 존치
        // AI 경로추천도 같은 분기다 (MSG-488 §1-3) — 서버가 익명 추천 요청을 401(2403)로 막는다
        if (
          (key === "profile" || key === "dex" || key === "aiRoute") &&
          !isAuthenticated
        ) {
          openLoginModal();
          return;
        }
        // 업로드는 페이지 이동 대신 모달을 연다 (URL 불변) — AC1
        if (key === "upload") {
          openUploadModal();
          return;
        }
        // 활성 탭 재클릭 → 초기화 후 접기/펼치기 2단 (AC 16), 다른 탭 → 이동하며 펼침
        if (key === getActiveNavKey(pathname)) {
          if (railReclickAction(sectionIsInitial(key)) === "toggle") toggle();
          else resetSection(key);
          return;
        }
        setCollapsed(false);
        navigate(ROUTES[key]);
      }}
    />
  );
};
