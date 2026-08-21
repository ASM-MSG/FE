import { beforeEach, describe, expect, it } from "vitest";
import { fcmTokenStorage } from "@/shared/storage";
import { usePushTokenStore } from "./push-token-store";

describe("usePushTokenStore — FCM 보관 토큰 반응형 스토어 (AC 5·7·9)", () => {
  beforeEach(() => {
    fcmTokenStorage.clear();
    usePushTokenStore.setState({ token: null });
  });

  it("setToken은 상태와 fcmTokenStorage에 함께 보관한다 (AC 5)", () => {
    usePushTokenStore.getState().setToken("tok-1");

    expect(usePushTokenStore.getState().token).toBe("tok-1");
    expect(fcmTokenStorage.get()).toBe("tok-1");
  });

  it("clearToken은 상태와 보관을 함께 비운다 (AC 7)", () => {
    usePushTokenStore.getState().setToken("tok-1");

    usePushTokenStore.getState().clearToken();

    expect(usePushTokenStore.getState().token).toBeNull();
    expect(fcmTokenStorage.get()).toBeNull();
  });

  it("refresh는 외부(로그아웃 경로)가 바꾼 저장소 실값으로 상태를 정렬한다 (AC 9)", () => {
    usePushTokenStore.getState().setToken("tok-1");
    // features/auth의 useLogout은 스토어를 모른 채 fcmTokenStorage만 비운다 (shared 매개)
    fcmTokenStorage.clear();

    usePushTokenStore.getState().refresh();

    expect(usePushTokenStore.getState().token).toBeNull();
  });
});
