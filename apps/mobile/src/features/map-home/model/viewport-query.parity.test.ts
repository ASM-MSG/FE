import { describe, expect, it } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";
import * as mobileViewportQuery from "./viewport-query";

/**
 * L1·L2: 뷰포트 → `GET /api/grids` 요청 판정·변환이 웹 원본과 동등하다 (MSG-423).
 * - L1: canQueryGrids(null)=false, 한 변 span > 0.5도면 false, 이내면 true.
 *       toGridsRequest가 sw/ne를 swLat·swLng·neLat·neLng로 그대로 매핑한다
 * - L2: viewportQueryArgs(null)은 enabled:false + 좌표 0 채움 — 지도 준비 전에는
 *       요청 인자가 만들어져도 발사되지 않는다
 *
 * 웹 원본은 변수 경로 동적 import로 로드한다 (grid.parity.test.ts 선례 —
 * 웹 소스의 "@/…" 별칭은 모바일 vitest.config의 parity 전용 alias가 해석한다).
 */
const WEB_VIEWPORT_QUERY_PATH = new URL(
  "../../../../../web/src/features/map-home/model/viewport-query.ts",
  import.meta.url,
).pathname;

interface WebViewportQuery {
  MAX_VIEWPORT_SPAN_DEG: number;
  toGridsRequest: typeof mobileViewportQuery.toGridsRequest;
  canQueryGrids: typeof mobileViewportQuery.canQueryGrids;
  viewportQueryArgs: typeof mobileViewportQuery.viewportQueryArgs;
}

const loadWebViewportQuery = (): Promise<WebViewportQuery> =>
  import(WEB_VIEWPORT_QUERY_PATH);

const boundsOf = (
  swLat: number,
  swLng: number,
  neLat: number,
  neLng: number,
): Bounds => ({
  sw: { lat: swLat, lng: swLng },
  ne: { lat: neLat, lng: neLng },
});

/** 경계값 표본 — 상한 이내·정확히 0.5도·초과(위도/경도 각각) */
const BOUNDS_SAMPLES: Bounds[] = [
  boundsOf(35.15, 129.05, 35.17, 129.07), // 서면 근방 통상 뷰포트
  boundsOf(35, 129, 35.5, 129.5), // 한 변 정확히 0.5도 (포함 경계)
  boundsOf(35, 129, 35.6, 129.5), // 위도 span 초과
  boundsOf(35, 129, 35.5, 129.6), // 경도 span 초과
  boundsOf(-0.001, -0.002, 0.001, 0.002), // 음수 좌표
];

describe("viewport-query 동등성 (L1·L2)", () => {
  it("MAX_VIEWPORT_SPAN_DEG가 웹 정본(0.5도)과 같다 (L1)", async () => {
    const web = await loadWebViewportQuery();

    expect(mobileViewportQuery.MAX_VIEWPORT_SPAN_DEG).toBe(
      web.MAX_VIEWPORT_SPAN_DEG,
    );
    expect(mobileViewportQuery.MAX_VIEWPORT_SPAN_DEG).toBe(0.5);
  });

  it("canQueryGrids가 null에 false를, span 상한 초과에 false를, 이내에 true를 반환한다 — 웹과 전건 동일 (L1)", async () => {
    const web = await loadWebViewportQuery();

    expect(mobileViewportQuery.canQueryGrids(null)).toBe(false);
    expect(mobileViewportQuery.canQueryGrids(null)).toBe(
      web.canQueryGrids(null),
    );
    for (const bounds of BOUNDS_SAMPLES) {
      expect(mobileViewportQuery.canQueryGrids(bounds)).toBe(
        web.canQueryGrids(bounds),
      );
    }
    expect(mobileViewportQuery.canQueryGrids(BOUNDS_SAMPLES[1])).toBe(true);
    expect(mobileViewportQuery.canQueryGrids(BOUNDS_SAMPLES[2])).toBe(false);
    expect(mobileViewportQuery.canQueryGrids(BOUNDS_SAMPLES[3])).toBe(false);
  });

  it("toGridsRequest가 sw.lat/sw.lng/ne.lat/ne.lng를 swLat/swLng/neLat/neLng로 그대로 매핑한다 — 웹과 전건 동일 (L1)", async () => {
    const web = await loadWebViewportQuery();

    for (const bounds of BOUNDS_SAMPLES) {
      expect(mobileViewportQuery.toGridsRequest(bounds)).toEqual(
        web.toGridsRequest(bounds),
      );
    }
    expect(mobileViewportQuery.toGridsRequest(BOUNDS_SAMPLES[0])).toEqual({
      swLat: 35.15,
      swLng: 129.05,
      neLat: 35.17,
      neLng: 129.07,
    });
  });

  it("viewportQueryArgs(null)이 enabled:false + 좌표 0 채움을 반환한다 — 지도 준비 전 미발사 (L2)", async () => {
    const web = await loadWebViewportQuery();

    expect(mobileViewportQuery.viewportQueryArgs(null)).toEqual({
      query: { swLat: 0, swLng: 0, neLat: 0, neLng: 0 },
      enabled: false,
    });
    expect(mobileViewportQuery.viewportQueryArgs(null)).toEqual(
      web.viewportQueryArgs(null),
    );
  });

  it("viewportQueryArgs가 bounds 표본 전건에서 웹과 같은 {query, enabled}를 만든다 (L2)", async () => {
    const web = await loadWebViewportQuery();

    for (const bounds of BOUNDS_SAMPLES) {
      expect(mobileViewportQuery.viewportQueryArgs(bounds)).toEqual(
        web.viewportQueryArgs(bounds),
      );
    }
  });
});
