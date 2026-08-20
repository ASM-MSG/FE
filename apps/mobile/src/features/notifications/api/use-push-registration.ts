import { useCallback, useEffect, useState } from "react";
import { register, unregister } from "../../../shared/api/sdk";
import { fcmTokenStorage } from "../../../shared/fcm-token-storage";
import { derivePushEnabled } from "../model/push-registration";
import {
  appVersion,
  devicePlatform,
  readDevicePushToken,
  readPermissionStatus,
  requestPermission,
} from "./notifications-adapter";
import {
  disablePush,
  enablePush,
  syncPushToken,
  type PushDeps,
} from "./push-registration-flow";

/**
 * 실제 의존 묶음 (MSG-429 기준 14) — 네이티브 어댑터·보관소·생성 SDK를 오케스트레이션에
 * 주입한다. 판정과 순서는 `push-registration-flow`가 소유하고 여기는 배선만 한다.
 */
export const pushDeps: PushDeps = {
  readPermission: readPermissionStatus,
  requestPermission,
  readDeviceToken: readDevicePushToken,
  readStoredToken: fcmTokenStorage.read,
  saveStoredToken: fcmTokenStorage.save,
  clearStoredToken: fcmTokenStorage.clear,
  registerToken: async (fcmToken) => {
    await register({
      body: { fcmToken, platform: devicePlatform(), appVersion: appVersion() },
      throwOnError: true,
    });
  },
  unregisterToken: async (fcmToken) => {
    await unregister({ query: { fcmToken }, throwOnError: true });
  },
};

export interface PushRegistration {
  /** 푸시 축의 ON/OFF — 권한 granted && 보관 토큰 존재 */
  enabled: boolean;
  busy: boolean;
  /** 권한 거부·등록 실패 안내. 정상이면 null */
  error: "denied" | "failed" | null;
  setEnabled: (next: boolean) => Promise<void>;
}

/**
 * 푸시 등록 상태·조작 (기준 14·15) — 프로필 "알림 받기" 토글이 서버 preferences 저장과
 * **함께** 호출한다. 두 축을 한 훅에 합치지 않은 이유: preferences 저장은 MSG-426이 세운
 * 낙관·롤백 계약을 갖고 있고, 푸시 등록은 권한이라는 되돌릴 수 없는 축이 있어 실패 의미가
 * 다르다. 한 스위치가 둘을 각각 시도하고 각각 보고한다.
 */
export const usePushRegistration = (): PushRegistration => {
  const [enabled, setEnabledState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"denied" | "failed" | null>(null);

  /** 진입 시 현재 상태 판독 — 기기 설정에서 권한을 바꿨을 수 있다 */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const [permission, storedToken] = await Promise.all([
        readPermissionStatus(),
        fcmTokenStorage.read(),
      ]);
      if (!alive) return;
      setEnabledState(
        derivePushEnabled({ permission, hasStoredToken: storedToken !== null }),
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    setBusy(true);
    setError(null);
    const result = next
      ? await enablePush(pushDeps)
      : await disablePush(pushDeps);
    // 표시는 **실제 결과**를 따른다 — 실패한 조작이 켜진 것처럼 남지 않게 한다
    setEnabledState(result.status === "enabled");
    setError(
      result.status === "denied" || result.status === "failed"
        ? result.status
        : null,
    );
    setBusy(false);
  }, []);

  return { enabled, busy, error, setEnabled };
};

/**
 * 앱 셸 상주 자동 동기화 (기준 14) — 기존 등록자의 토큰 재등록·로테이션.
 * 신규 등록 경로가 아니므로 권한 프롬프트는 절대 뜨지 않는다.
 */
export const usePushTokenSync = (isAuthenticated: boolean): void => {
  useEffect(() => {
    void syncPushToken(pushDeps, isAuthenticated);
  }, [isAuthenticated]);
};
