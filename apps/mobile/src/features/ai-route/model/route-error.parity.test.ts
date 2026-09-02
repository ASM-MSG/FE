import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/api/api-error";
import { routeErrorNotice } from "./route-error";

/**
 * L5: 실패 → UI 반응 매핑 7행(§1-4)이 웹 `route-error.ts`와 동치다 (MSG-556).
 * `ApiError`는 두 앱이 각자 복제본을 가지므로(instanceof 판정) **웹 함수엔 웹 ApiError,
 * 모바일 함수엔 모바일 ApiError**를 넣어 결과를 대조한다.
 * 웹 원본은 변수 경로 동적 import (map-scale.parity.test.ts 선례).
 */
const WEB_ROUTE_ERROR_PATH = new URL(
  "../../../../../web/src/features/ai-route/model/route-error.ts",
  import.meta.url,
).pathname;
const WEB_API_ERROR_PATH = new URL(
  "../../../../../web/src/shared/api/api-error.ts",
  import.meta.url,
).pathname;

interface Notice {
  message: string | null;
  retryable: boolean;
  disablesFeature: boolean;
  requiresLogin: boolean;
}

interface WebRouteError {
  routeErrorNotice: (error: unknown) => Notice;
}

interface WebApiErrorModule {
  ApiError: new (
    message: string,
    options?: { status?: number; developCode?: number },
  ) => Error;
}

const loadWeb = async () => {
  const [routeError, apiError]: [WebRouteError, WebApiErrorModule] =
    await Promise.all([
      import(WEB_ROUTE_ERROR_PATH),
      import(WEB_API_ERROR_PATH),
    ]);
  return { ...routeError, WebApiError: apiError.ApiError };
};

/** §1-4 표 7행 + 미분류 5xx·미지 developCode·ApiError 아님 */
const CASES: { status?: number; developCode?: number }[] = [
  { status: 400, developCode: 14400 },
  { status: 400, developCode: 14401 },
  { status: 429, developCode: 14429 },
  { status: 502, developCode: 14502 },
  { status: 503, developCode: 14503 },
  { status: 401, developCode: 2403 },
  { status: 401 },
  {},
  { status: 500 },
  { status: 500, developCode: 99999 },
];

describe("routeErrorNotice 동등성 — 웹 route-error 대조 (L5)", () => {
  it("§1-4 표 전건에서 웹과 같은 {message, retryable, disablesFeature, requiresLogin}을 낸다", async () => {
    const { routeErrorNotice: webNotice, WebApiError } = await loadWeb();

    for (const options of CASES) {
      expect(routeErrorNotice(new ApiError("서버 원문", options))).toEqual(
        webNotice(new WebApiError("서버 원문", options)),
      );
    }
    expect(routeErrorNotice(new Error("알 수 없음"))).toEqual(
      webNotice(new Error("알 수 없음")),
    );
  });

  it("14503은 재시도 없이 기능을 끄고, 401/2403은 문구 없이 로그인을 요구하며, status 없음은 네트워크 안내다 (§1-4)", () => {
    expect(
      routeErrorNotice(new ApiError("x", { status: 503, developCode: 14503 })),
    ).toEqual({
      message: "지금은 경로 추천을 쓸 수 없어요",
      retryable: false,
      disablesFeature: true,
      requiresLogin: false,
    });
    expect(routeErrorNotice(new ApiError("x", { status: 401 }))).toEqual({
      message: null,
      retryable: false,
      disablesFeature: false,
      requiresLogin: true,
    });
    expect(routeErrorNotice(new ApiError("x", {}))).toEqual({
      message: "네트워크 상태를 확인하고 다시 시도해 주세요",
      retryable: true,
      disablesFeature: false,
      requiresLogin: false,
    });
  });
});
