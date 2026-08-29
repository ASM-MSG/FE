import { describe, expect, it } from "vitest";
import type { Bounds } from "@/entities/cell";
import {
  MAX_ROUTE_TEXT_LENGTH,
  SECONDARY_MIN_INTERVAL_MS,
  buildRecommendBody,
  canSubmit,
  needsSpanNormalize,
  secondaryDelayMs,
  submitLabel,
  toViewportDto,
} from "./route-request";

const BOUNDS: Bounds = {
  sw: { lat: 35.1521, lng: 129.0537 },
  ne: { lat: 35.1662, lng: 129.0712 },
};

const SUBMITTABLE = {
  text: "서면에서 밥 먹고 저녁 경기까지 동선 짜 줘",
  status: "idle",
  featureDisabled: false,
  mapReady: true,
} as const;

describe("toViewportDto — 뷰포트 변환 (L9)", () => {
  it("Bounds{sw,ne}를 서버 뷰포트 사각형으로 바꾼다 (L9)", () => {
    expect(toViewportDto(BOUNDS)).toEqual({
      minLat: 35.1521,
      minLng: 129.0537,
      maxLat: 35.1662,
      maxLng: 129.0712,
    });
  });
});

describe("buildRecommendBody — 요청 본문 조립 (L9)", () => {
  it("문장을 trim해 뷰포트와 함께 싣는다 (L9)", () => {
    expect(
      buildRecommendBody({ text: "  서면 동선  ", bounds: BOUNDS }),
    ).toEqual({ text: "서면 동선", viewport: toViewportDto(BOUNDS) });
  });

  it("bounds가 null이면 요청을 만들지 않는다 — 지도 준비 전 제출은 무시된다 (L9)", () => {
    expect(buildRecommendBody({ text: "서면 동선", bounds: null })).toBeNull();
  });

  it("trim 후 빈 문장이면 요청을 만들지 않는다 (L9)", () => {
    expect(buildRecommendBody({ text: "   ", bounds: BOUNDS })).toBeNull();
  });
});

describe("canSubmit — 제출 가능 판정 (L8)", () => {
  it("trim 후 1~500자면 제출할 수 있다 (L8)", () => {
    expect(canSubmit(SUBMITTABLE)).toBe(true);
    expect(canSubmit({ ...SUBMITTABLE, text: "가" })).toBe(true);
    expect(
      canSubmit({ ...SUBMITTABLE, text: "가".repeat(MAX_ROUTE_TEXT_LENGTH) }),
    ).toBe(true);
  });

  it("공백뿐이거나 500자를 넘으면 제출할 수 없다 (L8, 경계)", () => {
    expect(canSubmit({ ...SUBMITTABLE, text: "   " })).toBe(false);
    expect(
      canSubmit({
        ...SUBMITTABLE,
        text: "가".repeat(MAX_ROUTE_TEXT_LENGTH + 1),
      }),
    ).toBe(false);
  });

  it("요청 중(loading)에는 제출할 수 없다 (L8)", () => {
    expect(canSubmit({ ...SUBMITTABLE, status: "loading" })).toBe(false);
  });

  it("기능이 꺼진 상태(14503)에서는 제출할 수 없다 (L8)", () => {
    expect(canSubmit({ ...SUBMITTABLE, featureDisabled: true })).toBe(false);
  });

  // codex 리뷰 P2 — 버튼이 활성인데 submit이 조용히 early-return하면 "눌러도 안 되는 버튼"이 된다.
  // canSubmit의 판정 집합을 buildRecommendBody의 성립 조건과 일치시킨다.
  it("지도 준비 전(bounds null)에는 제출할 수 없다 (L8, codex P2)", () => {
    expect(canSubmit({ ...SUBMITTABLE, mapReady: false })).toBe(false);
  });

  it("canSubmit이 true면 buildRecommendBody가 반드시 요청을 만든다 (L8↔L9 정합)", () => {
    const submittable = canSubmit({ ...SUBMITTABLE, mapReady: true });
    expect(submittable).toBe(true);
    expect(
      buildRecommendBody({ text: SUBMITTABLE.text, bounds: BOUNDS }),
    ).not.toBeNull();
    // 역도 성립 — 지도가 준비되지 않으면 양쪽 다 막힌다
    expect(canSubmit({ ...SUBMITTABLE, mapReady: false })).toBe(false);
    expect(
      buildRecommendBody({ text: SUBMITTABLE.text, bounds: null }),
    ).toBeNull();
  });
});

describe("buildRecommendBody — 출발지 병합 (L11)", () => {
  it("출발지를 주면 body에 origin이 실린다 (L11)", () => {
    expect(
      buildRecommendBody({
        text: "서면 동선",
        bounds: BOUNDS,
        origin: { lat: 35.1579, lng: 129.0594 },
      }),
    ).toEqual({
      text: "서면 동선",
      viewport: toViewportDto(BOUNDS),
      origin: { lat: 35.1579, lng: 129.0594 },
    });
  });

  it("출발지를 주지 않으면 origin 키 자체가 없다 (L11)", () => {
    const body = buildRecommendBody({ text: "서면 동선", bounds: BOUNDS });

    expect(body).not.toHaveProperty("origin");
    expect(
      buildRecommendBody({ text: "서면 동선", bounds: BOUNDS, origin: null }),
    ).not.toHaveProperty("origin");
  });
});

describe("needsSpanNormalize — 0.5도 초과 뷰포트 예방 판정 (L12)", () => {
  it("위·경도 어느 한 변이라도 0.5도를 넘으면 정규화가 필요하다 (L12)", () => {
    expect(
      needsSpanNormalize({
        sw: { lat: 35.0, lng: 129.0 },
        ne: { lat: 35.6, lng: 129.1 },
      }),
    ).toBe(true);
    expect(
      needsSpanNormalize({
        sw: { lat: 35.0, lng: 129.0 },
        ne: { lat: 35.1, lng: 129.6 },
      }),
    ).toBe(true);
  });

  it("두 변 모두 0.5도 이하면 정규화가 필요 없다 (L12, 경계 포함)", () => {
    expect(needsSpanNormalize(BOUNDS)).toBe(false);
    expect(
      needsSpanNormalize({
        sw: { lat: 35.0, lng: 129.0 },
        ne: { lat: 35.5, lng: 129.5 },
      }),
    ).toBe(false);
  });

  it("지도가 준비되기 전(bounds null)에는 정규화를 시도하지 않는다 (L12)", () => {
    expect(needsSpanNormalize(null)).toBe(false);
  });
});

describe("submitLabel — 제출 버튼 문구 (L13)", () => {
  it("최초 입력 대기는 '동선 짜기'다 (L13)", () => {
    expect(submitLabel({ status: "idle", originSent: false })).toBe(
      "동선 짜기",
    );
    expect(submitLabel({ status: "idle", originSent: true })).toBe("동선 짜기");
  });

  it("출발지를 실어 보낸 결과 화면은 '현재 위치에서 다시 짜기'다 (L13)", () => {
    expect(submitLabel({ status: "result", originSent: true })).toBe(
      "현재 위치에서 다시 짜기",
    );
  });

  it("출발지 없이 보낸 결과·실패 화면은 '다시 짜기'다 (L13)", () => {
    expect(submitLabel({ status: "result", originSent: false })).toBe(
      "다시 짜기",
    );
    expect(submitLabel({ status: "error", originSent: false })).toBe(
      "다시 짜기",
    );
  });
});

describe("secondaryDelayMs — 2차 자동 재요청 대기 (Q2 안 B)", () => {
  it("1차 요청 시작으로부터 10초 창이 남아 있으면 남은 만큼 기다린다", () => {
    expect(secondaryDelayMs({ requestedAt: 1_000, now: 4_000 })).toBe(
      SECONDARY_MIN_INTERVAL_MS - 3_000,
    );
  });

  it("창이 이미 지났으면 기다리지 않는다 (경계 — 음수 바닥)", () => {
    expect(
      secondaryDelayMs({
        requestedAt: 1_000,
        now: 1_000 + SECONDARY_MIN_INTERVAL_MS,
      }),
    ).toBe(0);
    expect(secondaryDelayMs({ requestedAt: 1_000, now: 60_000 })).toBe(0);
  });

  it("1차 요청 시각을 모르면 기다리지 않는다", () => {
    expect(secondaryDelayMs({ requestedAt: null, now: 4_000 })).toBe(0);
  });
});
