import { describe, expect, it } from "vitest";
import {
  KAKAO_AUTHORIZE_PATH,
  buildKakaoAuthorizeUrl,
  parseKakaoCallback,
  toKakaoLoginFailure,
} from "./kakao-oauth";

const API_BASE_URL = "https://api.fillmap.kr";
const REDIRECT_URI = "http://localhost:5173/oauth/kakao/callback";

describe("buildKakaoAuthorizeUrl — 서버 로그인 진입점 URL", () => {
  const url = new URL(
    buildKakaoAuthorizeUrl({
      apiBaseUrl: API_BASE_URL,
      redirectUri: REDIRECT_URI,
      state: "STATE_TOKEN",
    }),
  );

  it("카카오가 아니라 서버 진입점으로 향한다 — 앱 키·scope·nonce는 서버 몫이다", () => {
    expect(url.origin).toBe(API_BASE_URL);
    expect(url.pathname).toBe(KAKAO_AUTHORIZE_PATH);
  });

  it("콜백 주소를 그대로 넘긴다 — 4단계 코드 교환 요청에도 같은 값을 쓴다", () => {
    expect(url.searchParams.get("redirectUri")).toBe(REDIRECT_URI);
  });

  it("state를 그대로 싣는다 — 콜백에서 대조할 CSRF 토큰", () => {
    expect(url.searchParams.get("state")).toBe("STATE_TOKEN");
  });

  it("앱 키를 싣지 않는다 — REST API 키가 클라이언트로 나갈 경로가 없다", () => {
    expect(url.searchParams.get("client_id")).toBeNull();
  });
});

describe("toKakaoLoginFailure — 서버 오류코드 해석", () => {
  it("2423은 코드 만료·재사용 — 처음부터 다시 로그인해야 한다", () => {
    expect(toKakaoLoginFailure(2423)).toBe("expired");
  });

  it("2502는 카카오 장애 — 잠시 후 재시도 안내다", () => {
    expect(toKakaoLoginFailure(2502)).toBe("provider");
  });

  it("그 외·코드 없음은 일반 실패로 다룬다", () => {
    expect(toKakaoLoginFailure(9999)).toBe("unknown");
    expect(toKakaoLoginFailure(undefined)).toBe("unknown");
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
