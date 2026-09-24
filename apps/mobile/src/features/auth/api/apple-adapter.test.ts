import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 템플릿 ① 순수 로직(경계 계약) — 애플 네이티브 모듈 격리 경계 (MSG-601 L9, kakao-adapter.test 미러).
 *
 * 이 테스트가 지키는 것은 **로드 시점**이다. `expo-apple-authentication`·`expo-crypto`는 네이티브
 * 모듈이라 vitest(node)에서 파싱조차 되지 않고, 실기에서도 모듈이 빠진 APK에서는 접근 자체가
 * 던진다(MSG-429 `expo-notifications` 정적 import 앱 전멸 사고). 정적 import였다면 아래 import
 * 한 줄이 해석 실패로 던진다.
 *
 * `react-native`의 `Platform`만 모듈 mock으로 대체한다 — 어댑터가 iOS 여부를 보는 유일한
 * 플랫폼 참조이고, RN 본체는 node에서 파싱되지 않는다(템플릿 공통 규칙의 "훅·스토어·유틸
 * vi.mock 금지"는 네트워크·도메인 모듈 얘기다 — 여기서는 파싱 불가한 런타임 경계 하나만 바꾼다).
 */
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

afterEach(() => {
  vi.resetModules();
});

describe("apple-adapter (L9)", () => {
  it("모듈을 import하는 것만으로는 expo-apple-authentication·expo-crypto를 로드하지 않는다", async () => {
    await expect(import("./apple-adapter")).resolves.toHaveProperty(
      "requestAppleCredential",
    );
  });

  it("iOS가 아닌 플랫폼에서 호출하면 네이티브 모듈을 로드하지 않고 AppleUnavailable로 던진다 (A8)", async () => {
    const { requestAppleCredential } = await import("./apple-adapter");
    const { APPLE_UNAVAILABLE } = await import("../model/social-login-failure");

    // 모듈 로드가 일어났다면 해석 실패라는 **다른** 에러가 났을 것이므로,
    // code가 정확히 일치하는 것 자체가 "로드하지 않았다"의 증거다
    await expect(requestAppleCredential()).rejects.toMatchObject({
      code: APPLE_UNAVAILABLE,
    });
  });
});
