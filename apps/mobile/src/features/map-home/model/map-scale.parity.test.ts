import { describe, expect, it } from "vitest";
import * as mobileMapScale from "./map-scale";

/**
 * L1: 축척 표(zoom → 거리 라벨)와 역산 zoom 상수가 웹 원본과 전건 동일하다 (MSG-428).
 * 모바일에는 축척 바 UI가 없지만 집계 단위 경계 줌(aggregation-unit)이 이 표를 역산해
 * 쓰므로, 표가 갈라지면 두 앱의 단위 전환 줌이 조용히 달라진다 — 여기서 드리프트를 잡는다.
 *
 * 웹 원본은 변수 경로 동적 import (map-query-policy.parity.test.ts 선례).
 */
const WEB_MAP_SCALE_PATH = new URL(
  "../../../../../web/src/features/map-home/model/map-scale.ts",
  import.meta.url,
).pathname;

interface WebMapScale {
  MIN_ZOOM: number;
  MAX_ZOOM: number;
  MAP_SCALE_500M_ZOOM: number;
  MAP_SCALE_1KM_ZOOM: number;
  MAP_SCALE_2KM_ZOOM: number;
  MAP_SCALE_4KM_ZOOM: number;
  MAP_SCALE_8KM_ZOOM: number;
  scaleLabelForZoom: (zoom: number) => string;
}

const loadWebMapScale = (): Promise<WebMapScale> => import(WEB_MAP_SCALE_PATH);

/** zoom 유효 범위 전건 + 범위 밖·NaN — 라벨 파생이 클램프로 흡수하는지까지 본다 */
const ZOOM_SAMPLES = [
  -1,
  0,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  Number.NaN,
];

describe("map-scale 동등성 (L1)", () => {
  it("줌 유효 범위가 웹 정본(6~21)과 같다", async () => {
    const web = await loadWebMapScale();

    expect(mobileMapScale.MIN_ZOOM).toBe(web.MIN_ZOOM);
    expect(mobileMapScale.MAX_ZOOM).toBe(web.MAX_ZOOM);
    expect(mobileMapScale.MIN_ZOOM).toBe(6);
    expect(mobileMapScale.MAX_ZOOM).toBe(21);
  });

  it("역산 zoom 상수(500m=14·1km=13·2km=12·4km=11·8km=10)가 웹 정본과 같다", async () => {
    const web = await loadWebMapScale();

    expect(mobileMapScale.MAP_SCALE_500M_ZOOM).toBe(web.MAP_SCALE_500M_ZOOM);
    expect(mobileMapScale.MAP_SCALE_1KM_ZOOM).toBe(web.MAP_SCALE_1KM_ZOOM);
    expect(mobileMapScale.MAP_SCALE_2KM_ZOOM).toBe(web.MAP_SCALE_2KM_ZOOM);
    expect(mobileMapScale.MAP_SCALE_4KM_ZOOM).toBe(web.MAP_SCALE_4KM_ZOOM);
    expect(mobileMapScale.MAP_SCALE_8KM_ZOOM).toBe(web.MAP_SCALE_8KM_ZOOM);

    expect(mobileMapScale.MAP_SCALE_500M_ZOOM).toBe(14);
    expect(mobileMapScale.MAP_SCALE_1KM_ZOOM).toBe(13);
    expect(mobileMapScale.MAP_SCALE_4KM_ZOOM).toBe(11);
    expect(mobileMapScale.MAP_SCALE_8KM_ZOOM).toBe(10);
  });

  it("scaleLabelForZoom이 zoom 6~21 전건(+범위 밖·NaN)에서 웹과 같은 라벨을 낸다", async () => {
    const web = await loadWebMapScale();

    for (const zoom of ZOOM_SAMPLES) {
      expect(mobileMapScale.scaleLabelForZoom(zoom)).toBe(
        web.scaleLabelForZoom(zoom),
      );
    }
    expect(mobileMapScale.scaleLabelForZoom(16)).toBe("100m");
    expect(mobileMapScale.scaleLabelForZoom(14)).toBe("500m");
    expect(mobileMapScale.scaleLabelForZoom(10)).toBe("8km");
  });
});
