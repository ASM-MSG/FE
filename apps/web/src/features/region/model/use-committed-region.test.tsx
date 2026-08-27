import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { SEOMYEON_CENTER } from "@/shared/geolocation";
import { signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useRegionPanelStore } from "./region-panel-store";
import { useCommittedRegionBootstrap } from "./use-committed-region";

/**
 * 확정 지역 최초 채택 (MSG-403 AC 9 → MSG-474 비로그인 개방 AC 1).
 * 역지오코딩이 서버에서 익명 허용(MSG-467, 실측 2026-08-26)되어 비로그인도 첫 진입에서
 * 행정동이 확정돼야 한다 — 이 확정 위에 장소 불러오기·칩 최근접 이동이 얹힌다.
 */
const BUJEON_REGION = {
  regionCode: "2644056000",
  regionName: "부전제1동",
  parentCode: "2644000000",
};

const READY_BOUNDS = {
  sw: { lat: 35.153, lng: 129.053 },
  ne: { lat: 35.163, lng: 129.065 },
};

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
  useViewportStore.setState({ bounds: null, center: SEOMYEON_CENTER });
  useRegionPanelStore.setState(useRegionPanelStore.getInitialState(), true);
});

describe("useCommittedRegionBootstrap — 비로그인 (MSG-474 AC 1)", () => {
  it("비로그인 마운트에서도 reverse-geocode가 발사되고 응답 행정동으로 지역·영역이 확정된다", async () => {
    signOutForTest();
    useViewportStore.setState({ bounds: READY_BOUNDS });
    const received = stubFetch(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/regions/reverse-geocode") {
        return envelopeResponse(BUJEON_REGION);
      }
      return envelopeResponse(null);
    });

    renderHook(() => useCommittedRegionBootstrap(), { wrapper });

    await waitFor(() =>
      expect(useRegionPanelStore.getState().displayedRegion).toEqual({
        regionCode: "2644056000",
        regionName: "부전제1동",
      }),
    );
    expect(useRegionPanelStore.getState().committedBounds).toEqual(
      READY_BOUNDS,
    );
    expect(
      received.filter(
        ({ request }) =>
          new URL(request.url).pathname === "/api/regions/reverse-geocode",
      ).length,
    ).toBeGreaterThan(0);
  });
});
