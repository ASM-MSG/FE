import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "../../../test/envelope-response";

/**
 * L2 — 장소 검색 쿼리 옵션 계약 (MSG-578 D6). 모바일은 RN 렌더 인프라가 없어
 * `renderHook` 대신 훅과 **같은 옵션 팩토리**를 `QueryObserver`로 구동한다
 * (use-notification-toggle.test 관례). 네트워크는 fetch 스텁 한 곳에서만 가른다.
 */
const API_BASE = "https://api.test.local";

const PLACE = {
  name: "서면역",
  address: "부산 부산진구 중앙대로 지하 730",
  lat: 35.1579,
  lng: 129.0594,
  gridId: "16853_11419",
  zoneName: "서면",
  zoneCell: "A-14",
};

/** client-config가 모듈 로드 시점에 env를 읽으므로 스텁 후 동적 import */
const loadOptions = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { placeSearchQueryOptions } = await import("./use-place-search-query");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const observe = (q: string) => {
    const observer = new QueryObserver(queryClient, placeSearchQueryOptions(q));
    observer.subscribe(() => {});
    return observer;
  };
  return { observe };
};

/** 스텁이 경로·검색어 계약을 강제한다 — q가 실리지 않으면 실패 응답 */
const stubPlaces = () =>
  vi.fn(async (request: Request) => {
    const url = new URL(request.url);
    if (
      url.pathname === "/api/search/places" &&
      url.searchParams.get("q") === "서면"
    ) {
      return envelopeResponse([PLACE]);
    }
    return new Response(null, { status: 500 });
  });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("placeSearchQueryOptions — 장소 검색 (L2)", () => {
  it("빈 검색어는 조회하지 않는다 — enabled=false, fetch 0회", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { observe } = await loadOptions();

    const observer = observe("");

    expect(observer.getCurrentResult().data).toBeUndefined();
    expect(observer.getCurrentResult().fetchStatus).toBe("idle");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('"서면" 응답이 봉투 언랩되어 name·address·lat·lng 배열로 도착한다', async () => {
    vi.stubGlobal("fetch", stubPlaces());
    const { observe } = await loadOptions();

    const observer = observe("서면");

    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    expect(observer.getCurrentResult().data).toEqual([
      expect.objectContaining({
        name: "서면역",
        address: "부산 부산진구 중앙대로 지하 730",
        lat: 35.1579,
        lng: 129.0594,
      }),
    ]);
  });

  it("502(카카오 프록시 장애)면 isError로 확정되고 data는 없다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 502 })),
    );
    const { observe } = await loadOptions();

    const observer = observe("서면");

    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isError).toBe(true),
    );
    expect(observer.getCurrentResult().data).toBeUndefined();
  });
});
