import { describe, expect, it } from "vitest";
import { distanceMeters } from "./geo-distance";

/**
 * L7: `distanceMeters` 하버사인이 웹 `entities/cell/model/geo-distance.ts`와 동치다 (MSG-556).
 * 구간 거리(route-legs)의 재료라 두 앱의 "도보 약 Nm"가 갈리면 여기서 먼저 깨진다.
 * 웹 원본은 변수 경로 동적 import (map-scale.parity.test.ts 선례).
 */
const WEB_GEO_DISTANCE_PATH = new URL(
  "../../../../../web/src/entities/cell/model/geo-distance.ts",
  import.meta.url,
).pathname;

interface WebGeoDistance {
  distanceMeters: (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ) => number;
}

const loadWeb = (): Promise<WebGeoDistance> => import(WEB_GEO_DISTANCE_PATH);

/** 서면 일대 + 부산 밖 + 극단값 — 짧은 거리부터 반구 거리까지 */
const PAIRS: [{ lat: number; lng: number }, { lat: number; lng: number }][] = [
  [
    { lat: 35.1568, lng: 129.0594 },
    { lat: 35.1601, lng: 129.0621 },
  ],
  [
    { lat: 35.1579, lng: 129.0594 },
    { lat: 35.1579, lng: 129.0594 },
  ],
  [
    { lat: 35.1579, lng: 129.0594 },
    { lat: 37.5665, lng: 126.978 },
  ],
  [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 180 },
  ],
  [
    { lat: -33.8688, lng: 151.2093 },
    { lat: 51.5074, lng: -0.1278 },
  ],
];

describe("distanceMeters 동등성 — 웹 geo-distance 대조 (L7)", () => {
  it("좌표쌍 표본 전건에서 웹과 같은 거리(m)를 낸다", async () => {
    const web = await loadWeb();

    for (const [a, b] of PAIRS) {
      expect(distanceMeters(a, b)).toBe(web.distanceMeters(a, b));
    }
  });

  it("같은 점은 0m, 서면 이웃 두 점은 약 441m다 (경계·대표값)", () => {
    expect(distanceMeters(PAIRS[1][0], PAIRS[1][1])).toBe(0);
    expect(Math.round(distanceMeters(PAIRS[0][0], PAIRS[0][1]))).toBe(441);
  });
});
