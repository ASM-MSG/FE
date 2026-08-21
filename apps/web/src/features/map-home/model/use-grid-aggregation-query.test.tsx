import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { GRID_MIN_ZOOM } from "./grid-overlay";
import { MAP_SCALE_1KM_ZOOM, MAP_SCALE_500M_ZOOM } from "./map-scale";
import { useThemeFilterStore } from "./theme-filter-store";
import { useGridAggregationQuery } from "./use-grid-aggregation-query";

/** 서면 일대 뷰포트 — 어떤 unit 상한(최소 1.0도)보다도 작다 */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.17, lng: 129.07 },
};

/** 부전2동 단일 항목 집계 응답 스텁 — 수신 요청 목록으로 발사 여부를 단정한다 */
const stubAggregation = () =>
  stubFetch(async () =>
    envelopeResponse({
      currentRegion: {
        regionCode: "2623051000",
        name: "부전2동",
        gridCount: 9,
        videoCount: 12,
      },
      items: [
        {
          regionCode: "2623051000",
          name: "부전2동",
          lat: 35.1579,
          lng: 129.0594,
          count: 9,
        },
      ],
    }),
  );

// 집계 조회는 보호 API — 기본은 로그인 + 칩 없음 상태로 고정한다
beforeEach(() => {
  signInForTest();
  useThemeFilterStore.setState({ activeTheme: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("useGridAggregationQuery — 저줌 집계 조회 게이트 (AC 2·3·9)", () => {
  it("로그인 + 저줌 + 칩 없음이면 조회가 나가고, 요청에는 그 줌의 unit이 실린다 (AC 2)", async () => {
    const received = stubAggregation();

    const { result } = renderHook(
      () => useGridAggregationQuery(SEOMYEON_VIEWPORT, MAP_SCALE_500M_ZOOM),
      { wrapper },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].name).toBe("부전2동");
    expect(received).toHaveLength(1);
    const url = new URL(received[0].request.url);
    expect(url.pathname.endsWith("/api/grids/aggregation")).toBe(true);
    expect(url.searchParams.get("unit")).toBe("DONG");
  });

  it("1km 단 줌에서는 unit이 SIGUNGU로 실린다 (AC 2)", async () => {
    const received = stubAggregation();

    renderHook(
      () => useGridAggregationQuery(SEOMYEON_VIEWPORT, MAP_SCALE_1KM_ZOOM),
      { wrapper },
    );

    await waitFor(() => expect(received).toHaveLength(1));
    expect(new URL(received[0].request.url).searchParams.get("unit")).toBe(
      "SIGUNGU",
    );
  });

  it("zoom ≥ GRID_MIN_ZOOM(고줌)에서는 요청이 나가지 않는다 (AC 2)", async () => {
    const received = stubAggregation();

    const { result } = renderHook(
      () => useGridAggregationQuery(SEOMYEON_VIEWPORT, GRID_MIN_ZOOM),
      { wrapper },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
    expect(result.current.items).toEqual([]);
  });

  it("비로그인이면 요청이 나가지 않는다 (AC 2·13)", async () => {
    const received = stubAggregation();
    signOutForTest();

    const { result } = renderHook(
      () => useGridAggregationQuery(SEOMYEON_VIEWPORT, MAP_SCALE_500M_ZOOM),
      { wrapper },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
    expect(result.current.items).toEqual([]);
  });

  it("칩 활성 중에는 요청도 없고 items도 비며, 칩 해제 시 다시 조회된다 (AC 2·9)", async () => {
    const received = stubAggregation();
    useThemeFilterStore.setState({ activeTheme: "hot" });

    const { result } = renderHook(
      () => useGridAggregationQuery(SEOMYEON_VIEWPORT, MAP_SCALE_500M_ZOOM),
      { wrapper },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
    expect(result.current.items).toEqual([]);

    act(() => {
      useThemeFilterStore.setState({ activeTheme: null });
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(received).toHaveLength(1);
  });

  it("뷰포트 span이 unit 상한을 넘으면 중심 기준으로 잘라 요청한다 (AC 3)", async () => {
    const received = stubAggregation();
    // lat span 2.0 / lng span 3.0 — 동 상한 1.0도 초과
    const wide: Bounds = {
      sw: { lat: 34.0, lng: 128.0 },
      ne: { lat: 36.0, lng: 131.0 },
    };

    renderHook(() => useGridAggregationQuery(wide, MAP_SCALE_500M_ZOOM), {
      wrapper,
    });

    await waitFor(() => expect(received).toHaveLength(1));
    const params = new URL(received[0].request.url).searchParams;
    expect(Number(params.get("swLat"))).toBeCloseTo(34.5, 10);
    expect(Number(params.get("neLat"))).toBeCloseTo(35.5, 10);
    expect(Number(params.get("swLng"))).toBeCloseTo(129.0, 10);
    expect(Number(params.get("neLng"))).toBeCloseTo(130.0, 10);
  });

  it("unit이 바뀌면 새 응답이 오기 전까지 이전 unit의 items를 반환하지 않는다 (codex 리뷰 P2)", async () => {
    // SIGUNGU 응답은 게이트를 열기 전까지 pending — 전환 직후 상태를 관찰하기 위함
    let releaseSigungu!: () => void;
    const sigunguGate = new Promise<void>((resolve) => {
      releaseSigungu = resolve;
    });
    stubFetch(async (request) => {
      const unit = new URL(request.url).searchParams.get("unit");
      if (unit === "SIGUNGU") await sigunguGate;
      return envelopeResponse({
        currentRegion: null,
        items: [
          unit === "SIGUNGU"
            ? {
                regionCode: "2623000000",
                name: "부산진구",
                lat: 35.1631,
                lng: 129.0532,
                count: 21,
              }
            : {
                regionCode: "2623051000",
                name: "부전2동",
                lat: 35.1579,
                lng: 129.0594,
                count: 9,
              },
        ],
      });
    });

    const { result, rerender } = renderHook(
      ({ zoom }: { zoom: number }) =>
        useGridAggregationQuery(SEOMYEON_VIEWPORT, zoom),
      { wrapper, initialProps: { zoom: MAP_SCALE_500M_ZOOM } },
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    // DONG → SIGUNGU 경계를 넘는다 — 이전 unit(DONG) 마커가 남으면 이름·크기·병합
    // 임계·클릭 줌이 잠깐 어긋난다
    rerender({ zoom: MAP_SCALE_1KM_ZOOM });
    expect(result.current.unit).toBe("SIGUNGU");
    expect(result.current.items).toEqual([]);

    await act(async () => releaseSigungu());
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0].name).toBe("부산진구");
  });

  it("같은 unit에서 bbox만 바뀌면 새 응답 전까지 직전 items를 유지한다 (추정 6 회귀 가드)", async () => {
    // 두 번째 요청(이동 후 bbox)은 게이트를 열기 전까지 pending
    let releaseSecond!: () => void;
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    let calls = 0;
    const received = stubFetch(async () => {
      calls += 1;
      if (calls > 1) await secondGate;
      return envelopeResponse({
        currentRegion: null,
        items: [
          {
            regionCode: "2623051000",
            name: "부전2동",
            lat: 35.1579,
            lng: 129.0594,
            count: 9,
          },
        ],
      });
    });

    const { result, rerender } = renderHook(
      ({ bounds }: { bounds: Bounds }) =>
        useGridAggregationQuery(bounds, MAP_SCALE_500M_ZOOM),
      { wrapper, initialProps: { bounds: SEOMYEON_VIEWPORT } },
    );
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    // 같은 DONG unit 안에서 뷰포트만 살짝 이동 — 직전 마커가 유지돼야 깜빡이지 않는다
    const shifted: Bounds = {
      sw: { lat: 35.16, lng: 129.06 },
      ne: { lat: 35.18, lng: 129.08 },
    };
    rerender({ bounds: shifted });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe("부전2동");

    await act(async () => releaseSecond());
    await waitFor(() => expect(received).toHaveLength(2));
  });

  it("뷰포트 준비 전(null)에는 조회하지 않는다 (AC 2)", async () => {
    const received = stubAggregation();

    const { result } = renderHook(
      () => useGridAggregationQuery(null, MAP_SCALE_500M_ZOOM),
      { wrapper },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
    expect(result.current.items).toEqual([]);
  });
});
