import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useRecentRemovalStore } from "@/features/dex/model/recent-removal-store";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { DexPanel } from "./DexPanel";

/**
 * 도감 스모크 공용 렌더 하네스 (MSG-327) — 도감 스모크가 3개 파일로 갈리면서 라우터·쿼리
 * 프로바이더·MapShell 대역 조립이 그대로 반복됐다. 조립은 한곳에 두고 각 파일은 케이스만 쓴다.
 */

/**
 * 도감 패널을 라우트째 렌더한다 — path로 탭(/dex·/dex/badges)을 고른다.
 * MapShell 대역은 Outlet을 인라인 element로 둔다(별도 컴포넌트 선언 없음) —
 * 이 파일이 컴포넌트를 export하면 oxlint react/only-export-components에 걸린다.
 * 도감은 로그인 전용 표면(RequireAuth 뒤)이라 로그인 상태로 렌더한다 — 사용자별
 * 조회(collections/*)의 비로그인 게이트(MSG-474)가 스모크를 막지 않게 한다.
 */
export const renderDexPanel = (path = "/dex", moveTo: () => void = vi.fn()) => {
  signInForTest();
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            element={
              <Outlet
                context={{
                  moveTo,
                  zoomIn: vi.fn(),
                  zoomOut: vi.fn(),
                  locate: vi.fn(),
                }}
              />
            }
          >
            <Route path="/dex/:tab?" element={<DexPanel />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

/** 케이스 간 상태 누수 차단 — 도감이 구독하는 스토어 4종 + 인증 세션을 초기로 되돌린다 */
export const resetDexStores = () => {
  signOutForTest();
  useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
  useRecentRemovalStore.setState(useRecentRemovalStore.getInitialState(), true);
  useGalleryRegionStore.setState(useGalleryRegionStore.getInitialState(), true);
  useVideoMiniPanelStore.setState(
    useVideoMiniPanelStore.getInitialState(),
    true,
  );
};
