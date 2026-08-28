import { describe, expect, it } from "vitest";
import type { Bounds } from "@/entities/cell";
import {
  MAX_ROUTE_TEXT_LENGTH,
  buildRecommendBody,
  canSubmit,
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
});
