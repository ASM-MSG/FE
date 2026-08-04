import { describe, expect, it } from "vitest";

import { startKakaoLogin } from "./kakao-login";

describe("startKakaoLogin", () => {
  // 스텁 계약: 실연동 전까지 어떤 환경에서 호출해도 예외 없이 no-op이어야 한다.
  // __DEV__는 Metro가 주입하는 전역이라 RN 밖(vitest node)에서는 존재하지 않는다 —
  // 이 테스트가 모델의 환경 전역 의존(ReferenceError)을 막는다.
  it("호출해도 예외를 던지지 않는다 (스텁 계약)", () => {
    expect(() => startKakaoLogin()).not.toThrow();
  });
});
