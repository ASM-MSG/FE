import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { GRID_MIN_ZOOM } from "./grid-overlay";
import { MAP_SCALE_1KM_ZOOM, MAP_SCALE_500M_ZOOM, MIN_ZOOM } from "./map-scale";
import { useMissionAggregationQuery } from "./use-mission-aggregation-query";

/** 서면 일대 뷰포트 — 어떤 unit 상한(최소 1.0도)보다도 작다 */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.17, lng: 129.07 },
};

/** 부산진구 단일 항목 미션 집계 응답 — data가 배열 직접이다(도감의 {items}와 다름) */
const stubMissionAggregation = () =>
  stubFetch(async () =>
    envelopeResponse([
      {
        regionCode: "26230",
        name: "부산진구",
        lat: 35.1568,
        lng: 129.0592,
        count: 12,
        missionIds: [1, 2, 3],
      },
    ]),
  );

/** 훅 렌더 축약 — 인자 3개만 다른 renderHook 호출이 케이스마다 반복된다 */
const renderAggregation = (
  theme: Parameters<typeof useMissionAggregationQuery>[0],
  bounds: Parameters<typeof useMissionAggregationQuery>[1],
  zoom: number,
) =>
  renderHook(() => useMissionAggregationQuery(theme, bounds, zoom), {
    wrapper,
  });

beforeEach(() => {
  signInForTest();
});

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("useMissionAggregationQuery — 저줌 미션 집계 조회 게이트 (AC 1·4·5)", () => {
  it("로그인 + 축제 칩 + 저줌이면 조회가 나가고 type·unit이 실린다 (AC 1)", async () => {
    const received = stubMissionAggregation();

    const { result } = renderAggregation(
      "festival",
      SEOMYEON_VIEWPORT,
      MAP_SCALE_500M_ZOOM,
    );

    await waitFor(() => expect(result.current.markers).toHaveLength(1));
    expect(result.current.markers[0].name).toBe("부산진구");
    expect(result.current.markers[0].theme).toBe("festival");

    const url = new URL(received[0].request.url);
    expect(url.pathname.endsWith("/api/missions/aggregation")).toBe(true);
    expect(url.searchParams.get("type")).toBe("EVENT");
    expect(url.searchParams.get("unit")).toBe("DONG");
  });

  it("팝업 칩은 type POPUP으로 조회한다 (AC 1)", async () => {
    const received = stubMissionAggregation();

    renderAggregation("popup", SEOMYEON_VIEWPORT, MAP_SCALE_500M_ZOOM);

    await waitFor(() => expect(received).toHaveLength(1));
    expect(new URL(received[0].request.url).searchParams.get("type")).toBe(
      "POPUP",
    );
  });

  it("1km 단 줌에서는 unit이 SIGUNGU로 실린다 (AC 1)", async () => {
    const received = stubMissionAggregation();

    renderAggregation("festival", SEOMYEON_VIEWPORT, MAP_SCALE_1KM_ZOOM);

    await waitFor(() => expect(received).toHaveLength(1));
    expect(new URL(received[0].request.url).searchParams.get("unit")).toBe(
      "SIGUNGU",
    );
  });

  it("축척 100m 이내(개별 격자 구간)에서는 조회하지 않는다 (AC 1)", async () => {
    const received = stubMissionAggregation();

    const { result } = renderAggregation(
      "festival",
      SEOMYEON_VIEWPORT,
      GRID_MIN_ZOOM,
    );

    await waitFor(() => expect(result.current.markers).toHaveLength(0));
    expect(received).toHaveLength(0);
  });

  it("칩이 없으면 조회하지 않는다 — 핫구역·경로추천 포함 (AC 4)", async () => {
    const received = stubMissionAggregation();

    const { result } = renderAggregation(
      null,
      SEOMYEON_VIEWPORT,
      MAP_SCALE_500M_ZOOM,
    );

    await waitFor(() => expect(result.current.markers).toHaveLength(0));
    expect(received).toHaveLength(0);
  });

  it("비로그인이면 조회하지 않는다 — 익명 401 재발사를 막는다 (추정 6)", async () => {
    signOutForTest();
    const received = stubMissionAggregation();

    const { result } = renderAggregation(
      "festival",
      SEOMYEON_VIEWPORT,
      MAP_SCALE_500M_ZOOM,
    );

    // 요청이 아예 나가지 않는 것이 이 기준의 주장이다 — 마커가 빈 것은 그 결과다
    await waitFor(() => expect(received).toHaveLength(0));
    expect(result.current.markers).toHaveLength(0);
  });

  it("뷰포트가 없으면(지도 준비 전) 조회하지 않는다 (경계)", async () => {
    const received = stubMissionAggregation();

    renderAggregation("festival", null, MAP_SCALE_500M_ZOOM);

    await waitFor(() => expect(received).toHaveLength(0));
  });

  it("뷰포트가 unit 상한보다 넓으면 bbox를 잘라 요청한다 — 초과 시 서버 12401 (AC 5)", async () => {
    const received = stubMissionAggregation();
    // 최소 줌의 전국 뷰포트: 위·경도 각 20도로 SIDO 상한(10도)을 크게 넘는다
    const WORLD: Bounds = {
      sw: { lat: 25, lng: 119 },
      ne: { lat: 45, lng: 139 },
    };

    renderAggregation("festival", WORLD, MIN_ZOOM);

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
});
