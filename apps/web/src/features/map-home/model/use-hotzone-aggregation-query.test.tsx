import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { GRID_MIN_ZOOM } from "./grid-overlay";
import {
  MAP_SCALE_1KM_ZOOM,
  MAP_SCALE_500M_ZOOM,
  MAP_SCALE_8KM_ZOOM,
  MIN_ZOOM,
} from "./map-scale";
import { useHotZoneAggregationQuery } from "./use-hotzone-aggregation-query";

/** 서면 일대 뷰포트 — 어떤 unit 상한(최소 1.0도)보다도 작다 */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.17, lng: 129.07 },
};

/** 부전2동 단일 항목 핫구역 집계 응답 — data가 배열 직접이다(도감의 {items}와 다름) */
const stubHotZoneAggregation = () =>
  stubFetch(async () =>
    envelopeResponse([
      {
        regionCode: "2623051000",
        name: "부전2동",
        lat: 35.1579,
        lng: 129.0594,
        count: 7,
        gridIds: ["g1", "g2", "g3", "g4", "g5", "g6", "g7"],
      },
    ]),
  );

/** 훅 렌더 축약 — 인자 3개만 다른 renderHook 호출이 케이스마다 반복된다 */
const renderAggregation = (
  active: boolean,
  bounds: Bounds | null,
  zoom: number,
) =>
  renderHook(() => useHotZoneAggregationQuery(active, bounds, zoom), {
    wrapper,
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useHotZoneAggregationQuery — 핫구역 저줌 집계 조회 게이트 (AC 6~9)", () => {
  it("핫 칩 + 500m 단 줌이면 조회가 나가고 unit DONG이 실린다 (AC 6)", async () => {
    const received = stubHotZoneAggregation();

    const { result } = renderAggregation(
      true,
      SEOMYEON_VIEWPORT,
      MAP_SCALE_500M_ZOOM,
    );

    await waitFor(() => expect(result.current.markers).toHaveLength(1));
    expect(result.current.markers[0].name).toBe("부전2동");
    expect(result.current.markers[0].theme).toBe("hot");

    const url = new URL(received[0].request.url);
    expect(url.pathname.endsWith("/api/hotzones/aggregation")).toBe(true);
    expect(url.searchParams.get("unit")).toBe("DONG");
  });

  it("1km 단 줌에서는 unit이 SIGUNGU로 실린다 (AC 6)", async () => {
    const received = stubHotZoneAggregation();

    renderAggregation(true, SEOMYEON_VIEWPORT, MAP_SCALE_1KM_ZOOM);

    await waitFor(() => expect(received).toHaveLength(1));
    expect(new URL(received[0].request.url).searchParams.get("unit")).toBe(
      "SIGUNGU",
    );
  });

  it("16km 단 줌에서는 unit이 SIDO로 실린다 (AC 6)", async () => {
    const received = stubHotZoneAggregation();

    renderAggregation(true, SEOMYEON_VIEWPORT, MAP_SCALE_8KM_ZOOM - 1);

    await waitFor(() => expect(received).toHaveLength(1));
    expect(new URL(received[0].request.url).searchParams.get("unit")).toBe(
      "SIDO",
    );
  });

  it("축척 100m 이내(개별 격자 구간)에서는 조회하지 않는다 (AC 6)", async () => {
    const received = stubHotZoneAggregation();

    const { result } = renderAggregation(
      true,
      SEOMYEON_VIEWPORT,
      GRID_MIN_ZOOM,
    );

    await waitFor(() => expect(result.current.markers).toHaveLength(0));
    expect(received).toHaveLength(0);
  });

  it("핫 칩이 아니면 조회하지 않는다 (AC 6)", async () => {
    const received = stubHotZoneAggregation();

    const { result } = renderAggregation(
      false,
      SEOMYEON_VIEWPORT,
      MAP_SCALE_500M_ZOOM,
    );

    await waitFor(() => expect(result.current.markers).toHaveLength(0));
    expect(received).toHaveLength(0);
  });

  it("뷰포트가 없으면(지도 준비 전) 조회하지 않는다 (AC 6, 경계)", async () => {
    const received = stubHotZoneAggregation();

    renderAggregation(true, null, MAP_SCALE_500M_ZOOM);

    await waitFor(() => expect(received).toHaveLength(0));
  });

  it("뷰포트가 unit 상한보다 넓으면 bbox를 잘라 요청한다 — 초과 시 서버 400/8401 (AC 7)", async () => {
    const received = stubHotZoneAggregation();
    // 최소 줌의 전국 뷰포트: 위·경도 각 20도로 SIDO 상한(10도)을 크게 넘는다
    const WORLD: Bounds = {
      sw: { lat: 25, lng: 119 },
      ne: { lat: 45, lng: 139 },
    };

    renderAggregation(true, WORLD, MIN_ZOOM);

    await waitFor(() => expect(received).toHaveLength(1));
    const params = new URL(received[0].request.url).searchParams;
    expect(params.get("unit")).toBe("SIDO");
    expect(
      Number(params.get("neLat")) - Number(params.get("swLat")),
    ).toBeCloseTo(10);
    expect(
      Number(params.get("neLng")) - Number(params.get("swLng")),
    ).toBeCloseTo(10);
  });

  it("비로그인에서도 나머지 활성 조건(칩·저줌·뷰포트) 충족 시 조회한다 — 익명 허용 (AC 8)", async () => {
    signOutForTest();
    stubHotZoneAggregation();

    const { result } = renderAggregation(
      true,
      SEOMYEON_VIEWPORT,
      MAP_SCALE_500M_ZOOM,
    );

    await waitFor(() => expect(result.current.markers).toHaveLength(1));
    expect(result.current.markers[0].name).toBe("부전2동");
  });

  it("unit이 바뀌면 새 응답이 오기 전까지 이전 unit의 마커를 반환하지 않는다 (AC 9)", async () => {
    // SIGUNGU 응답은 게이트를 열기 전까지 pending — 전환 직후 상태를 관찰하기 위함
    let releaseSigungu!: () => void;
    const sigunguGate = new Promise<void>((resolve) => {
      releaseSigungu = resolve;
    });
    stubFetch(async (request) => {
      const unit = new URL(request.url).searchParams.get("unit");
      if (unit === "SIGUNGU") await sigunguGate;
      return envelopeResponse([
        unit === "SIGUNGU"
          ? {
              regionCode: "26230",
              name: "부산진구",
              lat: 35.1631,
              lng: 129.0532,
              count: 21,
              gridIds: [],
            }
          : {
              regionCode: "2623051000",
              name: "부전2동",
              lat: 35.1579,
              lng: 129.0594,
              count: 7,
              gridIds: [],
            },
      ]);
    });

    const { result, rerender } = renderHook(
      ({ zoom }: { zoom: number }) =>
        useHotZoneAggregationQuery(true, SEOMYEON_VIEWPORT, zoom),
      { wrapper, initialProps: { zoom: MAP_SCALE_500M_ZOOM } },
    );
    await waitFor(() => expect(result.current.markers).toHaveLength(1));

    // DONG → SIGUNGU 경계를 넘는다 — 이전 unit 마커가 남으면 크기·병합 임계·클릭 줌이 어긋난다
    rerender({ zoom: MAP_SCALE_1KM_ZOOM });
    expect(result.current.markers).toEqual([]);

    await act(async () => releaseSigungu());
    await waitFor(() => expect(result.current.markers).toHaveLength(1));
    expect(result.current.markers[0].name).toBe("부산진구");
  });

  it("같은 unit에서 bbox만 바뀌면 새 응답 전까지 직전 마커를 유지한다 (AC 9)", async () => {
    // 두 번째 요청(이동 후 bbox)은 게이트를 열기 전까지 pending
    let releaseSecond!: () => void;
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    let calls = 0;
    const received = stubFetch(async () => {
      calls += 1;
      if (calls > 1) await secondGate;
      return envelopeResponse([
        {
          regionCode: "2623051000",
          name: "부전2동",
          lat: 35.1579,
          lng: 129.0594,
          count: 7,
          gridIds: [],
        },
      ]);
    });

    const { result, rerender } = renderHook(
      ({ bounds }: { bounds: Bounds }) =>
        useHotZoneAggregationQuery(true, bounds, MAP_SCALE_500M_ZOOM),
      { wrapper, initialProps: { bounds: SEOMYEON_VIEWPORT } },
    );
    await waitFor(() => expect(result.current.markers).toHaveLength(1));

    // 같은 DONG unit 안에서 뷰포트만 살짝 이동 — 직전 마커가 유지돼야 깜빡이지 않는다
    const shifted: Bounds = {
      sw: { lat: 35.16, lng: 129.06 },
      ne: { lat: 35.18, lng: 129.08 },
    };
    rerender({ bounds: shifted });
    expect(result.current.markers).toHaveLength(1);
    expect(result.current.markers[0].name).toBe("부전2동");

    await act(async () => releaseSecond());
    await waitFor(() => expect(received).toHaveLength(2));
  });
});
