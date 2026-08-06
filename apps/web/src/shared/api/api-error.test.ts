import { describe, expect, it } from "vitest";
import { ApiError, normalizeApiError, shouldRetryQuery } from "./api-error";

// 수용 기준 7: HTTP 에러·봉투 에러·네트워크 실패를 단일 정규화 에러로 통일한다
// (화면 코드는 봉투·HTTP 계층을 모른다 — hey-api interceptors.error에서 호출)
describe("normalizeApiError", () => {
  it("7a. 401 봉투 바디 → status·developCode·message를 담은 ApiError를 반환한다", () => {
    const envelopeBody = {
      developCode: 2403,
      message: "인증이 필요합니다",
      data: null,
    };
    const response = new Response(null, { status: 401 });

    const normalized = normalizeApiError(envelopeBody, response);

    expect(normalized).toBeInstanceOf(ApiError);
    expect(normalized).toBeInstanceOf(Error);
    expect(normalized.status).toBe(401);
    expect(normalized.developCode).toBe(2403);
    expect(normalized.message).toBe("인증이 필요합니다");
  });

  it("7b. 봉투가 아닌 문자열 에러 바디 → status와 그 문자열 message만 담는다", () => {
    const response = new Response(null, { status: 502 });

    const normalized = normalizeApiError("Bad Gateway", response);

    expect(normalized).toBeInstanceOf(ApiError);
    expect(normalized.status).toBe(502);
    expect(normalized.developCode).toBeUndefined();
    expect(normalized.message).toBe("Bad Gateway");
  });

  it("7b. 봉투가 아닌 JSON 에러 바디(파싱 불가 포함) → status·대체 message만 담는다", () => {
    const response = new Response(null, { status: 500 });

    const normalized = normalizeApiError({ error: "oops" }, response);

    expect(normalized).toBeInstanceOf(ApiError);
    expect(normalized.status).toBe(500);
    expect(normalized.developCode).toBeUndefined();
    expect(normalized.message).toBe("HTTP 500");
  });

  it("7b. 빈 에러 바디(빈 문자열) → status·대체 message만 담는다", () => {
    const response = new Response(null, { status: 503 });

    const normalized = normalizeApiError("", response);

    expect(normalized.status).toBe(503);
    expect(normalized.message).toBe("HTTP 503");
  });

  it("7c. 네트워크 실패(fetch reject, response 없음) → status 없는 ApiError를 반환한다", () => {
    const normalized = normalizeApiError(
      new TypeError("Failed to fetch"),
      undefined,
    );

    expect(normalized).toBeInstanceOf(ApiError);
    expect(normalized.status).toBeUndefined();
    expect(normalized.developCode).toBeUndefined();
    expect(normalized.message).toBe("Failed to fetch");
  });
});

// 수용 기준 8: retry는 네트워크 오류·5xx만 최대 2회, 4xx는 재시도 0회
// (TanStack Query retry 콜백 — failureCount는 0부터, 판정 후 증가: <2 == 재시도 최대 2회·총 3회 시도)
describe("shouldRetryQuery", () => {
  it("5xx ApiError는 최대 2회 재시도한다 (failureCount 0·1 재시도, 2에서 중단)", () => {
    const serverError = new ApiError("서버 오류", { status: 500 });

    expect(shouldRetryQuery(0, serverError)).toBe(true);
    expect(shouldRetryQuery(1, serverError)).toBe(true);
    expect(shouldRetryQuery(2, serverError)).toBe(false);
  });

  it("네트워크 오류(status 없는 ApiError)는 최대 2회 재시도한다", () => {
    const networkError = new ApiError("Failed to fetch");

    expect(shouldRetryQuery(0, networkError)).toBe(true);
    expect(shouldRetryQuery(1, networkError)).toBe(true);
    expect(shouldRetryQuery(2, networkError)).toBe(false);
  });

  it("4xx ApiError는 재시도하지 않는다 (401 재발급은 MSG-324 Ky 훅 소관)", () => {
    expect(
      shouldRetryQuery(0, new ApiError("인증이 필요합니다", { status: 401 })),
    ).toBe(false);
    expect(
      shouldRetryQuery(0, new ApiError("찾을 수 없습니다", { status: 404 })),
    ).toBe(false);
  });

  it("ApiError가 아닌 에러는 재시도하지 않는다 (스펙 질문 9 승인 — 보수적 판정)", () => {
    expect(shouldRetryQuery(0, new Error("정규화되지 않은 에러"))).toBe(false);
    expect(shouldRetryQuery(0, "이상한 값")).toBe(false);
    expect(shouldRetryQuery(0, undefined)).toBe(false);
  });
});
