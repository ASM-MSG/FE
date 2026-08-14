import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useHomeMissions } from "./use-home-missions";

const festivalMission = {
  missionId: 1,
  type: "EVENT",
  title: "송도해변축제",
  targetCount: 1,
  startAt: null,
  endAt: null,
  shape: { cells: [{ gridId: "16858_11420", lat: 35.15, lng: 129.05 }] },
  description: null,
  placeName: null,
  sourceUrl: null,
  operationTime: null,
  imageUrl: null,
  distanceMeters: null,
  durationMinutes: null,
  difficulty: null,
};

/** 에러 경로는 재시도 백오프를 타면 타임아웃한다 — retry:false 클라이언트 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

beforeEach(signInForTest);

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

/**
 * 두 조회(미션 목록·내 수집 격자)는 별개 API라 따로 실패할 수 있다.
 * 이 훅이 두 실패를 **뭉치면** 목록 패널이 통째로 가려지고 메시지도 틀린다 (리뷰 지적).
 */
describe("useHomeMissions — 목록 실패와 진행도 실패는 따로 흐른다 (리뷰 반영)", () => {
  it("미션은 왔는데 수집 격자만 실패하면 목록은 살고 진행도만 실패로 표시된다", async () => {
    stubFetch(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/collections/grids")
        return new Response(null, { status: 500 });
      return envelopeResponse([festivalMission]);
    });

    const { result } = renderHook(
      () =>
        useHomeMissions({ activeTheme: "festival", selectedMissionId: null }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.progressFailed).toBe(true));
    // 목록은 가려지지 않는다 — 카드가 그대로 보여야 한다
    expect(result.current.isError).toBe(false);
    expect(result.current.missionViews).toHaveLength(1);
    expect(result.current.missionViews[0].title).toBe("송도해변축제");
  });

  it("미션 조회가 실패하면 목록 실패로 잡는다", async () => {
    stubFetch(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/missions/active")
        return new Response(null, { status: 500 });
      return envelopeResponse([]);
    });

    const { result } = renderHook(
      () =>
        useHomeMissions({ activeTheme: "festival", selectedMissionId: null }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.missionViews).toEqual([]);
  });

  it("둘 다 성공하면 어느 쪽도 실패로 표시하지 않는다 (경계)", async () => {
    stubFetch(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/collections/grids") return envelopeResponse([]);
      return envelopeResponse([festivalMission]);
    });

    const { result } = renderHook(
      () =>
        useHomeMissions({ activeTheme: "festival", selectedMissionId: null }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.missionViews).toHaveLength(1));
    expect(result.current.isError).toBe(false);
    expect(result.current.progressFailed).toBe(false);
  });
});
