import { describe, expect, it } from "vitest";
import { pointInPolygon, type BoundaryMultiPolygon } from "./boundary-geometry";
import type { LatLng } from "../../cell/model/grid";

/**
 * F-11: `pointInPolygon`(점의 폴리곤 내부 판정)이 웹 원본과 같은 입력에 같은 출력을 낸다
 * (MSG-427 승인 Q5). BOX 미션(폴리곤)을 격자 타일로 펼칠 때 셀 중심의 포함 판정에 쓴다.
 */
const WEB_BOUNDARY_PATH = new URL(
  "../../../../../web/src/entities/region/model/boundary-geometry.ts",
  import.meta.url,
).pathname;

interface WebBoundary {
  pointInPolygon: typeof pointInPolygon;
}

const loadWebBoundary = (): Promise<WebBoundary> => import(WEB_BOUNDARY_PATH);

/** 서면 인근 사각형 + 가운데 구멍 — 외곽 링/홀 조합 */
const RING_OUTER: LatLng[] = [
  { lat: 35.15, lng: 129.05 },
  { lat: 35.17, lng: 129.05 },
  { lat: 35.17, lng: 129.08 },
  { lat: 35.15, lng: 129.08 },
];
const RING_HOLE: LatLng[] = [
  { lat: 35.157, lng: 129.06 },
  { lat: 35.163, lng: 129.06 },
  { lat: 35.163, lng: 129.07 },
  { lat: 35.157, lng: 129.07 },
];

const SOLID: BoundaryMultiPolygon = [[RING_OUTER]];
const WITH_HOLE: BoundaryMultiPolygon = [[RING_OUTER, RING_HOLE]];

const POINT_SAMPLES: LatLng[] = [
  { lat: 35.16, lng: 129.065 }, // 홀 안
  { lat: 35.152, lng: 129.052 }, // 외곽 안·홀 밖
  { lat: 35.14, lng: 129.06 }, // 폴리곤 밖(남쪽)
  { lat: 35.16, lng: 129.09 }, // 폴리곤 밖(동쪽)
  { lat: 35.15, lng: 129.05 }, // 꼭짓점
];

describe("pointInPolygon 웹 원본 동등성 (F-11)", () => {
  it("표본 전건에서 웹 원본과 같은 포함 판정을 낸다", async () => {
    const web = await loadWebBoundary();

    for (const point of POINT_SAMPLES) {
      expect(pointInPolygon(point, SOLID)).toBe(
        web.pointInPolygon(point, SOLID),
      );
      expect(pointInPolygon(point, WITH_HOLE)).toBe(
        web.pointInPolygon(point, WITH_HOLE),
      );
    }
  });

  it("외곽 링 안이면서 홀 안이면 밖으로 판정한다", () => {
    const inHole = { lat: 35.16, lng: 129.065 };

    expect(pointInPolygon(inHole, SOLID)).toBe(true);
    expect(pointInPolygon(inHole, WITH_HOLE)).toBe(false);
  });
});
