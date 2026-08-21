import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * 템플릿 ① 순수 로직(경계 계약) — 네이티브 SDK 격리 경계 (기준 7·8).
 *
 * 이 테스트가 지키는 것은 **로드 시점**이다. `@react-native-kakao/*`는 네이티브 모듈이라
 * vitest(node)에서 파싱조차 되지 않고, 실기에서도 모듈이 빠진 APK에서는 접근 자체가 던진다.
 * MSG-429에서 `expo-notifications` 정적 import가 `_layout` 평가를 통째로 실패시켜 앱이
 * 렌더되지 않은 실기 사고가 있었다 — 그 재발을 여기서 기계로 막는다.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("kakao-adapter (기준 7·8)", () => {
  it("모듈을 import하는 것만으로는 네이티브 카카오 SDK를 로드하지 않는다 (기준 8)", async () => {
    // 정적 import였다면 이 한 줄이 react-native 해석 실패로 던진다
    await expect(import("./kakao-adapter")).resolves.toHaveProperty(
      "requestKakaoIdToken",
    );
  });

  it("네이티브 앱 키가 없으면 SDK를 로드하지 않고 설정 오류를 던진다 (기준 7)", async () => {
    vi.stubEnv("EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY", "");
    vi.resetModules();
    const { requestKakaoIdToken } = await import("./kakao-adapter");
    const { KAKAO_NOT_CONFIGURED } =
      await import("../model/kakao-login-failure");

    // SDK 로드가 일어났다면 모듈 해석 실패라는 **다른** 에러가 났을 것이므로,
    // code가 정확히 일치하는 것 자체가 "로드하지 않았다"의 증거다
    await expect(requestKakaoIdToken()).rejects.toMatchObject({
      code: KAKAO_NOT_CONFIGURED,
    });
  });
});
