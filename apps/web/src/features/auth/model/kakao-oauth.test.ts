import { describe, expect, it } from "vitest";
import {
  KAKAO_AUTHORIZE_ENDPOINT,
  buildKakaoAuthorizeUrl,
  parseKakaoCallback,
} from "./kakao-oauth";

const JS_KEY = "test_javascript_key";
const REDIRECT_URI = "http://localhost:5173/oauth/kakao/callback";

describe("buildKakaoAuthorizeUrl — 카카오 인가 요청 URL", () => {
  const url = new URL(
    buildKakaoAuthorizeUrl({
      jsKey: JS_KEY,
      redirectUri: REDIRECT_URI,
      state: "STATE_TOKEN",
    }),
  );

  it("카카오 인가 엔드포인트로 향한다", () => {
    expect(url.origin + url.pathname).toBe(KAKAO_AUTHORIZE_ENDPOINT);
  });

  it("client_id는 JavaScript 키다 — REST API 키는 프론트에 두지 않는다", () => {
    expect(url.searchParams.get("client_id")).toBe(JS_KEY);
  });

  it("인가 코드 플로우이고 redirect_uri는 콘솔 등록값 그대로다", () => {
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT_URI);
  });

  it("scope에 openid를 포함한다 — 없으면 서버가 요구하는 ID 토큰이 발급되지 않는다", () => {
    expect(url.searchParams.get("scope")?.split(",")).toContain("openid");
  });

  it("state를 그대로 싣는다 — 콜백에서 대조할 CSRF 토큰", () => {
    expect(url.searchParams.get("state")).toBe("STATE_TOKEN");
  });
});

describe("parseKakaoCallback — 콜백 쿼리 해석", () => {
  it("정상 콜백은 인가 코드와 state를 돌려준다", () => {
    expect(parseKakaoCallback("?code=AUTH_CODE&state=STATE_TOKEN")).toEqual({
      status: "code",
      code: "AUTH_CODE",
      state: "STATE_TOKEN",
    });
  });

  it("사용자가 동의를 취소하면 error 파라미터가 온다 — 실패 사유를 구분해 전달한다", () => {
    expect(
      parseKakaoCallback(
        "?error=access_denied&error_description=User%20denied",
      ),
    ).toEqual({
      status: "error",
      error: "access_denied",
      description: "User denied",
    });
  });

  it("code도 error도 없는 진입은 잘못된 콜백이다 — 직접 URL 입력·중복 진입", () => {
    expect(parseKakaoCallback("")).toEqual({ status: "invalid" });
    expect(parseKakaoCallback("?foo=bar")).toEqual({ status: "invalid" });
  });

  it("state가 없는 콜백도 code는 읽되 state는 null로 남긴다 — 대조는 호출부 책임", () => {
    expect(parseKakaoCallback("?code=AUTH_CODE")).toEqual({
      status: "code",
      code: "AUTH_CODE",
      state: null,
    });
  });
});
