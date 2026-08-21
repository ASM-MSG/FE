import { describe, expect, it } from "vitest";

import { developCodeOf, toKakaoLoginFailure } from "./kakao-login-failure";

/**
 * 기준 2: 서버 실패 해석은 웹 MSG-325 원본과 동등해야 한다 (parity).
 * 웹 원본은 `features/auth/model/kakao-oauth.ts`이고, 그 파일의 나머지(진입점 URL 조립·
 * 콜백 쿼리 해석)는 **서버 주도 웹 플로우 전용**이라 포팅 대상이 아니다 — 모바일은 네이티브
 * SDK 경로라 콜백 URL 자체가 없다(스펙 방식 B). 두 함수만 복제하고 동등성을 여기서 고정한다.
 * (consent-gate.parity.test.ts와 같은 웹 원본 동적 import 방식.)
 */
interface WebKakaoOauthModule {
  developCodeOf: typeof developCodeOf;
  toKakaoLoginFailure: typeof toKakaoLoginFailure;
}
const WEB_KAKAO_OAUTH_PATH = new URL(
  "../../../../../web/src/features/auth/model/kakao-oauth.ts",
  import.meta.url,
).pathname;
const loadWebKakaoOauth = (): Promise<WebKakaoOauthModule> =>
  import(WEB_KAKAO_OAUTH_PATH);

/** 계약상 의미가 갈리는 두 코드 + 경계·미상 값 */
const DEVELOP_CODES = [2423, 2502, 0, 9999, undefined];

/** developCodeOf가 받는 입력의 형태 — 정규화 에러·원시 봉투·비객체 */
const ERROR_SHAPES: unknown[] = [
  { developCode: 2423 },
  { developCode: 2502 },
  { developCode: "2423" },
  { message: "developCode 없음" },
  new Error("일반 오류"),
  null,
  undefined,
  "문자열",
];

describe("서버 실패 해석 동등성 (기준 2)", () => {
  it("developCode → 실패 사유 매핑이 웹 원본과 동일하다", async () => {
    const web = await loadWebKakaoOauth();

    for (const developCode of DEVELOP_CODES) {
      expect(toKakaoLoginFailure(developCode)).toBe(
        web.toKakaoLoginFailure(developCode),
      );
    }
  });

  it("에러 값에서 developCode를 꺼내는 결과가 웹 원본과 동일하다", async () => {
    const web = await loadWebKakaoOauth();

    for (const shape of ERROR_SHAPES) {
      expect(developCodeOf(shape)).toBe(web.developCodeOf(shape));
    }
  });
});
