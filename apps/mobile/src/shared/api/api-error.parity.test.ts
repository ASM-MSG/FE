import { describe, expect, it } from "vitest";
import { ApiError, normalizeApiError, shouldRetryQuery } from "./api-error";

/**
 * AC 4·9: 에러 정규화·재시도 판정이 웹과 동일하다 (수기 모듈 복제 + parity, 스펙 추정 3).
 * 클래스 인스턴스는 모듈이 다르면 참조도 다르므로 **관측 가능한 필드**(message·status·
 * developCode)와 판정 결과로 동등성을 고정한다.
 */
const webPath = (rel: string) =>
  new URL(`../../../../web/src/${rel}`, import.meta.url).pathname;

const loadWebApiError = (): Promise<{
  ApiError: typeof ApiError;
  normalizeApiError: typeof normalizeApiError;
  shouldRetryQuery: typeof shouldRetryQuery;
}> => import(webPath("shared/api/api-error.ts"));

/** 정규화 결과의 관측 가능한 형태 — 모듈 경계를 넘어 비교 가능한 값만 추린다 */
const shapeOf = (error: ApiError) => ({
  name: error.name,
  message: error.message,
  status: error.status,
  developCode: error.developCode,
});

const errorSamples: Array<[string, unknown, Response | undefined]> = [
  [
    "봉투 바디(401 도메인 코드)",
    { developCode: 2403, message: "인증이 필요합니다" },
    new Response(null, { status: 401 }),
  ],
  ["문자열 바디", "서버 점검 중", new Response(null, { status: 503 })],
  ["빈 바디", "", new Response(null, { status: 500 })],
  [
    "Error 인스턴스(네트워크 실패)",
    new TypeError("Network request failed"),
    undefined,
  ],
  ["응답 없는 알 수 없는 값", undefined, undefined],
];

describe("api-error 동등성 (AC 4)", () => {
  it("normalizeApiError 결과가 웹 원본과 동일하다 — 봉투/문자열/빈 바디/네트워크 실패", async () => {
    const web = await loadWebApiError();
    for (const [, error, response] of errorSamples) {
      expect(shapeOf(normalizeApiError(error, response))).toEqual(
        shapeOf(web.normalizeApiError(error, response)),
      );
    }
  });

  it("정규화 결과는 ApiError 인스턴스다 — 화면이 instanceof로 분기할 수 있다", () => {
    expect(
      normalizeApiError("실패", new Response(null, { status: 500 })),
    ).toBeInstanceOf(ApiError);
  });
});

describe("재시도 판정 동등성 (AC 9)", () => {
  it("shouldRetryQuery가 웹 원본과 동일하다 — 네트워크·5xx만 최대 2회, 4xx는 0회", async () => {
    const web = await loadWebApiError();
    const cases: Array<[number, unknown]> = [
      [0, new ApiError("네트워크", {})],
      [1, new ApiError("네트워크", {})],
      [2, new ApiError("네트워크", {})],
      [0, new ApiError("서버 오류", { status: 500 })],
      [1, new ApiError("서버 오류", { status: 503 })],
      [2, new ApiError("서버 오류", { status: 500 })],
      [0, new ApiError("권한 없음", { status: 401 })],
      [0, new ApiError("없음", { status: 404 })],
      [0, new Error("정규화 안 된 예외")],
    ];
    for (const [failureCount, error] of cases) {
      // 웹 판정은 웹 ApiError 인스턴스로 동일 입력을 구성해 비교한다 (instanceof 경계)
      const webError =
        error instanceof ApiError
          ? new web.ApiError(error.message, {
              status: error.status,
              developCode: error.developCode,
            })
          : error;
      expect(shouldRetryQuery(failureCount, error)).toBe(
        web.shouldRetryQuery(failureCount, webError),
      );
    }
  });
});
