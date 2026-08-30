import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import { routeErrorNotice } from "./route-error";

const apiError = (options: { status?: number; developCode?: number }) =>
  new ApiError("서버 원문", options);

describe("routeErrorNotice — developCode → UI 반응 매핑 (L5, §1-4)", () => {
  it("14400·14401(뷰포트)은 지도 조정 안내 + 재시도 행이다 (L5)", () => {
    for (const developCode of [14400, 14401]) {
      expect(routeErrorNotice(apiError({ status: 400, developCode }))).toEqual({
        message:
          "지도를 조금 더 확대하거나 다른 곳으로 옮긴 뒤 다시 시도해 주세요",
        retryable: true,
        disablesFeature: false,
        requiresLogin: false,
      });
    }
  });

  it("14429(요청 과다)는 서버와 같은 문구로 사유까지 알린다 — 클라이언트 쿨다운은 걸지 않는다 (L5, Q7)", () => {
    expect(
      routeErrorNotice(apiError({ status: 429, developCode: 14429 })),
    ).toEqual({
      message: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요",
      retryable: true,
      disablesFeature: false,
      requiresLogin: false,
    });
  });

  it("14502(AI 실패)는 문장 이해 실패 안내 + 재시도 행이다 (L5)", () => {
    expect(
      routeErrorNotice(apiError({ status: 502, developCode: 14502 })),
    ).toEqual({
      message: "AI가 문장을 이해하지 못했어요. 다시 시도해 주세요",
      retryable: true,
      disablesFeature: false,
      requiresLogin: false,
    });
  });

  it("14503(기능 꺼짐)은 재시도 행이 없고 기능을 세션 동안 비활성화한다 (L5)", () => {
    expect(
      routeErrorNotice(apiError({ status: 503, developCode: 14503 })),
    ).toEqual({
      message: "지금은 경로 추천을 쓸 수 없어요",
      retryable: false,
      disablesFeature: true,
      requiresLogin: false,
    });
  });

  it("401 또는 developCode 2403은 패널 문구 없이 로그인 모달을 요구한다 (L5)", () => {
    const expected = {
      message: null,
      retryable: false,
      disablesFeature: false,
      requiresLogin: true,
    };

    expect(
      routeErrorNotice(apiError({ status: 401, developCode: 2403 })),
    ).toEqual(expected);
    expect(routeErrorNotice(apiError({ status: 401 }))).toEqual(expected);
  });

  it("status가 없으면(네트워크 실패) 네트워크 안내다 (L5)", () => {
    expect(routeErrorNotice(apiError({}))).toEqual({
      message: "네트워크 상태를 확인하고 다시 시도해 주세요",
      retryable: true,
      disablesFeature: false,
      requiresLogin: false,
    });
  });

  it("미분류 5xx와 ApiError가 아닌 오류는 공통 실패 안내다 (L5)", () => {
    const expected = {
      message: "동선을 짜지 못했어요. 잠시 후 다시 시도해 주세요",
      retryable: true,
      disablesFeature: false,
      requiresLogin: false,
    };

    expect(routeErrorNotice(apiError({ status: 500 }))).toEqual(expected);
    expect(routeErrorNotice(new Error("알 수 없음"))).toEqual(expected);
  });
});
