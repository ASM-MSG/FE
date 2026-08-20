import { describe, expect, it } from "vitest";
import {
  blurConfirmRoute,
  parseVideoIdParam,
  resolveBlurCloseTarget,
  resolveBlurPushRoute,
} from "./blur-entry";

describe("parseVideoIdParam — 진입 파라미터 방어 (기준 2)", () => {
  it("숫자 문자열을 videoId로 읽는다", () => {
    expect(parseVideoIdParam("42")).toBe(42);
  });

  it("expo-router가 배열로 주면 첫 값을 쓴다", () => {
    expect(parseVideoIdParam(["42", "7"])).toBe(42);
  });

  it("없거나 숫자가 아니면 null이다 — 화면이 안내로 종결한다", () => {
    expect(parseVideoIdParam(undefined)).toBeNull();
    expect(parseVideoIdParam("")).toBeNull();
    expect(parseVideoIdParam("abc")).toBeNull();
    expect(parseVideoIdParam("4.2")).toBeNull();
    expect(parseVideoIdParam("-1")).toBeNull();
    expect(parseVideoIdParam("0")).toBeNull();
    expect(parseVideoIdParam([])).toBeNull();
  });
});

describe("resolveBlurCloseTarget — [확인] 복귀 지점 (기준 4·5)", () => {
  it("돌아갈 화면이 있으면 스택을 되감는다", () => {
    expect(resolveBlurCloseTarget(true)).toEqual({ kind: "back" });
  });

  it("스택이 비었으면(푸시 콜드 스타트) 지도 홈으로 대체 복귀한다", () => {
    expect(resolveBlurCloseTarget(false)).toEqual({
      kind: "replace",
      route: "/home",
    });
  });
});

describe("blurConfirmRoute — 알림 진입 경로 (기준 1)", () => {
  it("videoId를 쿼리로 실어 /upload/blur로 보낸다", () => {
    expect(blurConfirmRoute(42)).toBe("/upload/blur?videoId=42");
  });
});

describe("resolveBlurPushRoute — 푸시 payload → 진입 경로 (기준 16)", () => {
  it("data.videoId가 숫자면 확인 화면 경로를 만든다", () => {
    expect(resolveBlurPushRoute({ videoId: 42 })).toBe(
      "/upload/blur?videoId=42",
    );
  });

  it("BE가 문자열로 실어 보내도 읽는다 — FCM data는 문자열 맵이다", () => {
    expect(resolveBlurPushRoute({ videoId: "42" })).toBe(
      "/upload/blur?videoId=42",
    );
  });

  it("payload가 없거나 videoId가 없거나 형식이 어긋나면 null이다 — 알림 탭이 무동작으로 안전 폴백한다", () => {
    expect(resolveBlurPushRoute(undefined)).toBeNull();
    expect(resolveBlurPushRoute(null)).toBeNull();
    expect(resolveBlurPushRoute("videoId=42")).toBeNull();
    expect(resolveBlurPushRoute({})).toBeNull();
    expect(resolveBlurPushRoute({ videoId: "abc" })).toBeNull();
    expect(resolveBlurPushRoute({ videoId: 0 })).toBeNull();
    expect(resolveBlurPushRoute({ videoId: -3 })).toBeNull();
    expect(resolveBlurPushRoute({ videoId: 1.5 })).toBeNull();
  });
});
