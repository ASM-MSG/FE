import { describe, expect, it } from "vitest";
import type { Bounds, LatLng } from "../../../entities/cell/model/grid";
import { isWithinBounds, resolveRouteOrigin } from "./route-origin";

/**
 * L2: 출발지 자동 판정이 웹 `features/ai-route/model/route-origin.ts`와 동치다 (MSG-559).
 * 웹 원본은 변수 경로 동적 import (route-request.parity.test.ts 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/ai-route/model/route-origin.ts",
  import.meta.url,
).pathname;

interface WebRouteOrigin {
  isWithinBounds: (coords: LatLng, bounds: Bounds) => boolean;
  resolveRouteOrigin: (input: {
    coords: LatLng | null;
    bounds: Bounds | null;
  }) => unknown;
}

const loadWeb = (): Promise<WebRouteOrigin> => import(WEB_PATH);

const BOUNDS: Bounds = {
  sw: { lat: 35.1521, lng: 129.0537 },
  ne: { lat: 35.1662, lng: 129.0712 },
};

/** 안 / 경도만 밖 / 위도만 밖 / 둘 다 밖 / 남서 꼭짓점 / 북동 꼭짓점 */
const COORDS: LatLng[] = [
  { lat: 35.1579, lng: 129.0594 },
  { lat: 35.1579, lng: 129.2 },
  { lat: 35.9, lng: 129.0594 },
  { lat: 35.9, lng: 129.2 },
  { lat: 35.1521, lng: 129.0537 },
  { lat: 35.1662, lng: 129.0712 },
];

describe("route-origin 동등성 (L2)", () => {
  it("isWithinBounds가 표본 전건에서 웹과 같고 경계선 위는 안으로 본다", async () => {
    const web = await loadWeb();

    for (const coords of COORDS) {
      expect(isWithinBounds(coords, BOUNDS)).toBe(
        web.isWithinBounds(coords, BOUNDS),
      );
    }
    expect(COORDS.map((coords) => isWithinBounds(coords, BOUNDS))).toEqual([
      true,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it("resolveRouteOrigin — 뷰포트 안이면 {lat,lng}, 밖·coords null·bounds null이면 null", async () => {
    const web = await loadWeb();

    for (const coords of [...COORDS, null]) {
      for (const bounds of [BOUNDS, null]) {
        expect(resolveRouteOrigin({ coords, bounds })).toEqual(
          web.resolveRouteOrigin({ coords, bounds }),
        );
      }
    }
    expect(resolveRouteOrigin({ coords: COORDS[0], bounds: BOUNDS })).toEqual({
      lat: 35.1579,
      lng: 129.0594,
    });
    expect(
      resolveRouteOrigin({ coords: COORDS[1], bounds: BOUNDS }),
    ).toBeNull();
    expect(
      resolveRouteOrigin({ coords: COORDS[2], bounds: BOUNDS }),
    ).toBeNull();
    expect(resolveRouteOrigin({ coords: null, bounds: BOUNDS })).toBeNull();
    expect(resolveRouteOrigin({ coords: COORDS[0], bounds: null })).toBeNull();
  });
});
