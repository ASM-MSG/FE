import { describe, expect, it } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";
import {
  MAX_ROUTE_TEXT_LENGTH,
  MAX_VIEWPORT_SPAN_DEG,
  SECONDARY_MIN_INTERVAL_MS,
  type SettleDeadline,
  VIEWPORT_SETTLE_TIMEOUT_MS,
  advanceSettleDeadline,
  buildRecommendBody,
  canSubmit,
  exceedsViewportSpan,
  needsZoomNormalize,
  reachedTargetViewport,
  secondaryDelayMs,
  submitLabel,
  toViewportDto,
} from "./route-request";

/**
 * L6(556): 요청 조립·제출 판정이 웹 `route-request.ts`와 동치이고,
 * `canSubmit === true ⇒ buildRecommendBody !== null` 정합이 성립한다.
 * MSG-559 L1·L4·L5·L6·L8: 489 산물(origin 병합·축척 정규화·서버 상한 가드·정착 마감·
 * 2차 대기·버튼 문구)까지 같은 파일에서 대조한다 — 이제 모바일은 웹의 **전량 복제**다.
 * 웹 원본은 변수 경로 동적 import (map-scale.parity.test.ts 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/ai-route/model/route-request.ts",
  import.meta.url,
).pathname;

type Status = "idle" | "loading" | "result" | "error";

interface Viewport {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

interface WebRouteRequest {
  MAX_ROUTE_TEXT_LENGTH: number;
  toViewportDto: (bounds: Bounds) => unknown;
  buildRecommendBody: (input: {
    text: string;
    bounds: Bounds | null;
    origin?: { lat: number; lng: number } | null;
  }) => unknown;
  canSubmit: (input: {
    text: string;
    status: Status;
    featureDisabled: boolean;
    mapReady: boolean;
  }) => boolean;
  needsZoomNormalize: (input: { zoom: number; targetZoom: number }) => boolean;
  MAX_VIEWPORT_SPAN_DEG: number;
  exceedsViewportSpan: (input: {
    viewport: Viewport;
    maxSpanDeg: number;
  }) => boolean;
  reachedTargetViewport: (input: {
    bounds: Bounds | null;
    boundsAtCommand: Bounds | null;
    zoom: number;
    targetZoom: number;
  }) => boolean;
  VIEWPORT_SETTLE_TIMEOUT_MS: number;
  advanceSettleDeadline: (input: {
    deadline: SettleDeadline | null;
    now: number;
    visible: boolean;
    timeoutMs: number;
  }) => { deadline: SettleDeadline; remainingMs: number };
  submitLabel: (input: { status: Status; originSent: boolean }) => string;
  SECONDARY_MIN_INTERVAL_MS: number;
  secondaryDelayMs: (input: {
    requestedAt: number | null;
    now: number;
  }) => number;
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

  it("buildRecommendBody가 origin을 주면 body.origin으로 싣고, 주지 않거나 null이면 origin 키 자체가 없다 (L1)", async () => {
    const web = await loadWeb();
    const origin = { lat: 35.1579, lng: 129.0594 };

    for (const value of [origin, null, undefined]) {
      expect(
        buildRecommendBody({
          text: "서면 동선",
          bounds: BOUNDS,
          origin: value,
        }),
      ).toEqual(
        web.buildRecommendBody({
          text: "서면 동선",
          bounds: BOUNDS,
          origin: value,
        }),
      );
    }
    expect(
      buildRecommendBody({ text: "서면 동선", bounds: BOUNDS, origin }),
    ).toHaveProperty("origin", origin);
    expect(
      buildRecommendBody({ text: "서면 동선", bounds: BOUNDS, origin: null }),
    ).not.toHaveProperty("origin");
    expect(
      buildRecommendBody({ text: "서면 동선", bounds: BOUNDS }),
    ).not.toHaveProperty("origin");
    // bounds null·빈 문장 불변 — origin이 있어도 요청을 만들지 않는다
    expect(
      buildRecommendBody({ text: "서면 동선", bounds: null, origin }),
    ).toBeNull();
    expect(
      buildRecommendBody({ text: "   ", bounds: BOUNDS, origin }),
    ).toBeNull();
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

describe("축척 정규화·도달 판정 동등성 (L4)", () => {
  it("needsZoomNormalize가 내림 비교다 — 13.4는 1km 단이라 false, 16·9는 true", async () => {
    const web = await loadWeb();
    const cases = [
      { zoom: 13.4, targetZoom: 13 },
      { zoom: 13, targetZoom: 13 },
      { zoom: 16, targetZoom: 13 },
      { zoom: 9, targetZoom: 13 },
    ];

    for (const input of cases) {
      expect(needsZoomNormalize(input)).toBe(web.needsZoomNormalize(input));
    }
    expect(needsZoomNormalize({ zoom: 13.4, targetZoom: 13 })).toBe(false);
    expect(needsZoomNormalize({ zoom: 16, targetZoom: 13 })).toBe(true);
    expect(needsZoomNormalize({ zoom: 9, targetZoom: 13 })).toBe(true);
  });

  it("reachedTargetViewport — bounds null은 false, boundsAtCommand null(재진입)은 true, 참조 동일은 false, 참조 교체+줌 13만 true", async () => {
    const web = await loadWeb();
    const moved: Bounds = {
      sw: { lat: 35.16, lng: 129.06 },
      ne: { lat: 35.17, lng: 129.07 },
    };
    const cases = [
      { bounds: null, boundsAtCommand: BOUNDS, zoom: 13, targetZoom: 13 },
      { bounds: BOUNDS, boundsAtCommand: null, zoom: 16, targetZoom: 13 },
      { bounds: BOUNDS, boundsAtCommand: BOUNDS, zoom: 13, targetZoom: 13 },
      { bounds: moved, boundsAtCommand: BOUNDS, zoom: 13, targetZoom: 13 },
      { bounds: moved, boundsAtCommand: BOUNDS, zoom: 16, targetZoom: 13 },
    ];

    for (const input of cases) {
      expect(reachedTargetViewport(input)).toBe(
        web.reachedTargetViewport(input),
      );
    }
    expect(cases.map((input) => reachedTargetViewport(input))).toEqual([
      false,
      true,
      false,
      true,
      false,
    ]);
  });
});

describe("서버 뷰포트 상한 가드 동등성 (L5)", () => {
  it("MAX_VIEWPORT_SPAN_DEG가 웹과 같은 0.5다", async () => {
    const web = await loadWeb();

    expect(MAX_VIEWPORT_SPAN_DEG).toBe(web.MAX_VIEWPORT_SPAN_DEG);
    expect(MAX_VIEWPORT_SPAN_DEG).toBe(0.5);
  });

  it("exceedsViewportSpan — 위도 변만 초과·경도 변만 초과는 true, 둘 다 0.5 이하(정확히 0.5 포함)는 false", async () => {
    const web = await loadWeb();
    const cases = [
      { minLat: 35, minLng: 129, maxLat: 35.6, maxLng: 129.1 },
      { minLat: 35, minLng: 129, maxLat: 35.1, maxLng: 129.6 },
      { minLat: 35, minLng: 129, maxLat: 35.5, maxLng: 129.5 },
      { minLat: 35, minLng: 129, maxLat: 35.01, maxLng: 129.02 },
    ];

    for (const viewport of cases) {
      const input = { viewport, maxSpanDeg: MAX_VIEWPORT_SPAN_DEG };
      expect(exceedsViewportSpan(input)).toBe(web.exceedsViewportSpan(input));
    }
    expect(
      cases.map((viewport) =>
        exceedsViewportSpan({ viewport, maxSpanDeg: MAX_VIEWPORT_SPAN_DEG }),
      ),
    ).toEqual([true, true, false, false]);
  });
});

describe("정착 마감·2차 대기 동등성 (L6)", () => {
  it("상한 상수가 웹과 같다 — 정착 3초, 2차 최소 간격 10.5초", async () => {
    const web = await loadWeb();

    expect(VIEWPORT_SETTLE_TIMEOUT_MS).toBe(web.VIEWPORT_SETTLE_TIMEOUT_MS);
    expect(VIEWPORT_SETTLE_TIMEOUT_MS).toBe(3_000);
    expect(SECONDARY_MIN_INTERVAL_MS).toBe(web.SECONDARY_MIN_INTERVAL_MS);
    expect(SECONDARY_MIN_INTERVAL_MS).toBe(10_500);
  });

  it("advanceSettleDeadline — 첫 예약은 now+3000, 재호출은 재계산 없이 남은 시간만, 만료는 0", async () => {
    const web = await loadWeb();
    const first = {
      deadline: null,
      now: 1_000,
      visible: true,
      timeoutMs: 3_000,
    };
    expect(advanceSettleDeadline(first)).toEqual(
      web.advanceSettleDeadline(first),
    );
    expect(advanceSettleDeadline(first)).toEqual({
      deadline: { deadlineAt: 4_000, hiddenSince: null },
      remainingMs: 3_000,
    });

    const again = {
      deadline: advanceSettleDeadline(first).deadline,
      now: 2_000,
      visible: true,
      timeoutMs: 3_000,
    };
    expect(advanceSettleDeadline(again)).toEqual(
      web.advanceSettleDeadline(again),
    );
    expect(advanceSettleDeadline(again)).toEqual({
      deadline: { deadlineAt: 4_000, hiddenSince: null },
      remainingMs: 2_000,
    });

    const expired = { ...again, now: 5_000 };
    expect(advanceSettleDeadline(expired)).toEqual(
      web.advanceSettleDeadline(expired),
    );
    expect(advanceSettleDeadline(expired).remainingMs).toBe(0);
  });

  it("advanceSettleDeadline — 숨은 구간은 마감을 소모하지 않고 복귀 시 그만큼 뒤로 밀린다", async () => {
    const web = await loadWeb();
    const started = advanceSettleDeadline({
      deadline: null,
      now: 1_000,
      visible: true,
      timeoutMs: 3_000,
    }).deadline;

    const hidden = {
      deadline: started,
      now: 1_500,
      visible: false,
      timeoutMs: 3_000,
    };
    expect(advanceSettleDeadline(hidden)).toEqual(
      web.advanceSettleDeadline(hidden),
    );
    expect(advanceSettleDeadline(hidden).deadline).toEqual({
      deadlineAt: 4_000,
      hiddenSince: 1_500,
    });

    const resumed = {
      deadline: advanceSettleDeadline(hidden).deadline,
      now: 3_000,
      visible: true,
      timeoutMs: 3_000,
    };
    expect(advanceSettleDeadline(resumed)).toEqual(
      web.advanceSettleDeadline(resumed),
    );
    expect(advanceSettleDeadline(resumed)).toEqual({
      deadline: { deadlineAt: 5_500, hiddenSince: null },
      remainingMs: 2_500,
    });
  });

  it("advanceSettleDeadline — 숨은 채 시작한 사이클은 첫 예약에 hiddenSince가 박힌다", async () => {
    const web = await loadWeb();
    const input = {
      deadline: null,
      now: 1_000,
      visible: false,
      timeoutMs: 3_000,
    };

    expect(advanceSettleDeadline(input)).toEqual(
      web.advanceSettleDeadline(input),
    );
    expect(advanceSettleDeadline(input).deadline).toEqual({
      deadlineAt: 4_000,
      hiddenSince: 1_000,
    });
  });

  it("secondaryDelayMs — requestedAt null은 0, 10.5초 창 안이면 잔여, 지나면 0", async () => {
    const web = await loadWeb();
    const cases = [
      { requestedAt: null, now: 5_000 },
      { requestedAt: 1_000, now: 3_000 },
      { requestedAt: 1_000, now: 11_500 },
      { requestedAt: 1_000, now: 20_000 },
    ];

    for (const input of cases) {
      expect(secondaryDelayMs(input)).toBe(web.secondaryDelayMs(input));
    }
    expect(cases.map((input) => secondaryDelayMs(input))).toEqual([
      0, 8_500, 0, 0,
    ]);
  });
});

describe("제출 버튼 문구 동등성 (L8)", () => {
  it("idle은 '동선 짜기', 결과·에러는 originSent에 따라 '현재 위치에서 다시 짜기'/'다시 짜기'", async () => {
    const web = await loadWeb();

    for (const status of STATUSES) {
      for (const originSent of [false, true]) {
        const input = { status, originSent };
        expect(submitLabel(input)).toBe(web.submitLabel(input));
      }
    }
    expect(submitLabel({ status: "idle", originSent: true })).toBe("동선 짜기");
    expect(submitLabel({ status: "result", originSent: true })).toBe(
      "현재 위치에서 다시 짜기",
    );
    expect(submitLabel({ status: "result", originSent: false })).toBe(
      "다시 짜기",
    );
    expect(submitLabel({ status: "error", originSent: true })).toBe(
      "현재 위치에서 다시 짜기",
    );
    expect(submitLabel({ status: "error", originSent: false })).toBe(
      "다시 짜기",
    );
  });
});
