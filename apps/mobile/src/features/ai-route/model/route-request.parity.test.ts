import { describe, expect, it } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";
import {
  MAX_ROUTE_TEXT_LENGTH,
  buildRecommendBody,
  canSubmit,
  toViewportDto,
} from "./route-request";

/**
 * L6: 요청 조립·제출 판정이 웹 `route-request.ts`(origin 미지정)와 동치이고,
 * `canSubmit === true ⇒ buildRecommendBody !== null` 정합이 성립한다 (MSG-556).
 * 489 산물(needsZoomNormalize·exceedsViewportSpan·submitLabel 등)은 대조하지 않는다.
 * 웹 원본은 변수 경로 동적 import (map-scale.parity.test.ts 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/ai-route/model/route-request.ts",
  import.meta.url,
).pathname;

type Status = "idle" | "loading" | "result" | "error";

interface WebRouteRequest {
  MAX_ROUTE_TEXT_LENGTH: number;
  toViewportDto: (bounds: Bounds) => unknown;
  buildRecommendBody: (input: {
    text: string;
    bounds: Bounds | null;
  }) => unknown;
  canSubmit: (input: {
    text: string;
    status: Status;
    featureDisabled: boolean;
    mapReady: boolean;
  }) => boolean;
}

const loadWeb = (): Promise<WebRouteRequest> => import(WEB_PATH);

const BOUNDS: Bounds = {
  sw: { lat: 35.1521, lng: 129.0537 },
  ne: { lat: 35.1662, lng: 129.0712 },
};

const TEXTS = [
  "서면에서 밥 먹고 저녁 경기까지 동선 짜 줘",
  "  서면 동선  ",
  "가",
  "   ",
  "",
  "가".repeat(500),
  "가".repeat(501),
];
const STATUSES: Status[] = ["idle", "loading", "result", "error"];

describe("route-request 동등성 (L6)", () => {
  it("MAX_ROUTE_TEXT_LENGTH가 웹과 같은 500이다", async () => {
    const web = await loadWeb();

    expect(MAX_ROUTE_TEXT_LENGTH).toBe(web.MAX_ROUTE_TEXT_LENGTH);
    expect(MAX_ROUTE_TEXT_LENGTH).toBe(500);
  });

  it("toViewportDto가 Bounds{sw,ne}를 웹과 같은 {minLat,minLng,maxLat,maxLng}로 바꾼다", async () => {
    const web = await loadWeb();

    expect(toViewportDto(BOUNDS)).toEqual(web.toViewportDto(BOUNDS));
    expect(toViewportDto(BOUNDS)).toEqual({
      minLat: 35.1521,
      minLng: 129.0537,
      maxLat: 35.1662,
      maxLng: 129.0712,
    });
  });

  it("buildRecommendBody({text,bounds})가 문장 표본 × bounds(있음/null) 전건에서 웹과 같고 — bounds null·빈 문장은 null, origin 키는 없다", async () => {
    const web = await loadWeb();

    for (const text of TEXTS) {
      for (const bounds of [BOUNDS, null]) {
        expect(buildRecommendBody({ text, bounds })).toEqual(
          web.buildRecommendBody({ text, bounds }),
        );
      }
    }
    const body = buildRecommendBody({ text: "  서면 동선  ", bounds: BOUNDS });
    expect(body).toEqual({
      text: "서면 동선",
      viewport: toViewportDto(BOUNDS),
    });
    expect(body && "origin" in body).toBe(false);
    expect(buildRecommendBody({ text: "서면 동선", bounds: null })).toBeNull();
  });

  it("canSubmit이 text × status × featureDisabled × mapReady 전건에서 웹과 같다 — trim 1~500 && !loading && !disabled && mapReady", async () => {
    const web = await loadWeb();

    for (const text of TEXTS) {
      for (const status of STATUSES) {
        for (const featureDisabled of [false, true]) {
          for (const mapReady of [false, true]) {
            const input = { text, status, featureDisabled, mapReady };
            expect(canSubmit(input)).toBe(web.canSubmit(input));
          }
        }
      }
    }
  });

  it("canSubmit이 true인 모든 입력에서 buildRecommendBody가 요청을 만든다 (정합)", () => {
    for (const text of TEXTS) {
      for (const status of STATUSES) {
        for (const featureDisabled of [false, true]) {
          for (const mapReady of [false, true]) {
            const bounds = mapReady ? BOUNDS : null;
            if (canSubmit({ text, status, featureDisabled, mapReady })) {
              expect(buildRecommendBody({ text, bounds })).not.toBeNull();
            }
          }
        }
      }
    }
    expect(
      canSubmit({
        text: "가",
        status: "idle",
        featureDisabled: false,
        mapReady: true,
      }),
    ).toBe(true);
    expect(
      canSubmit({
        text: "가",
        status: "idle",
        featureDisabled: false,
        mapReady: false,
      }),
    ).toBe(false);
  });
});
