import { describe, expect, it } from "vitest";
import type { Bounds } from "@/entities/cell";
import { resolveRouteOrigin } from "./route-origin";

/** 부산 서면 일대 — MVP 지역 (route-points 픽스처와 같은 기준) */
const BOUNDS: Bounds = {
  sw: { lat: 35.1521, lng: 129.0537 },
  ne: { lat: 35.1662, lng: 129.0712 },
};

const INSIDE = { lat: 35.1579, lng: 129.0594 };

describe("resolveRouteOrigin — 출발지 자동 판정 (L1~L5)", () => {
  it("현위치가 뷰포트 안이면 그 좌표를 출발지로 싣는다 (L1)", () => {
    expect(resolveRouteOrigin({ coords: INSIDE, bounds: BOUNDS })).toEqual({
      lat: 35.1579,
      lng: 129.0594,
    });
  });

  it("현위치가 뷰포트 밖이면 출발지를 싣지 않는다 (L2, 경도·위도 각각)", () => {
    expect(
      resolveRouteOrigin({
        coords: { lat: 35.1579, lng: 129.1204 },
        bounds: BOUNDS,
      }),
    ).toBeNull();
    expect(
      resolveRouteOrigin({
        coords: { lat: 35.2204, lng: 129.0594 },
        bounds: BOUNDS,
      }),
    ).toBeNull();
  });

  it("현위치를 못 얻었으면(권한 거부·미확보) 출발지를 싣지 않는다 (L3)", () => {
    expect(resolveRouteOrigin({ coords: null, bounds: BOUNDS })).toBeNull();
  });

  it("지도가 준비되기 전(bounds null)이면 출발지를 싣지 않는다 (L4)", () => {
    expect(resolveRouteOrigin({ coords: INSIDE, bounds: null })).toBeNull();
  });

  it("경계선 위 좌표는 뷰포트 안으로 판정한다 (L5, 포함 경계)", () => {
    expect(resolveRouteOrigin({ coords: BOUNDS.sw, bounds: BOUNDS })).toEqual(
      BOUNDS.sw,
    );
    expect(resolveRouteOrigin({ coords: BOUNDS.ne, bounds: BOUNDS })).toEqual(
      BOUNDS.ne,
    );
  });
});
