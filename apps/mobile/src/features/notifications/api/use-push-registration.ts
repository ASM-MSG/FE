import { useCallback, useEffect, useRef, useState } from "react";
import { register, unregister } from "../../../shared/api/sdk";
import { fcmTokenStorage } from "../../../shared/fcm-token-storage";
import type { PermissionState } from "../../../shared/permission-state";
import { useAppForeground } from "../../../shared/use-app-foreground";
import {
  derivePushEnabled,
  reconcilePushError,
} from "../model/push-registration";
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
  resolveToggleDisplay,
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
  /**
   * 현재 OS 알림 권한 (MSG-447 기준 11·13) — 토글을 한 번도 건드리지 않은 사용자에게도
   * 거부 사실을 보여주기 위해 노출한다. `error`는 조작 결과라 진입 직후에는 항상 null이다.
   */
  permission: PermissionState;
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
  const [permission, setPermission] = useState<PermissionState>("undetermined");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"denied" | "failed" | null>(null);

  /** 마운트 생존 플래그 — StrictMode 재마운트에서 되살아나야 하므로 마운트 훅에서 true로 세운다 */
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /**
   * 기기 실상태 판독 — 권한 + 보관 토큰.
   *
   * 판독을 함수로 뺀 이유(MSG-447 기준 13): 진입 시 1회로는 부족해졌다. 이 티켓이 사용자를
   * **시스템 설정으로 내보내기** 때문에, 권한을 켜고 돌아온 그 화면이 낡은 상태로 남으면
   * 우리가 안내한 복구 동선이 헛것이 된다.
   *
   * 실패를 삼키는 이유: 어댑터는 네이티브 모듈이 빠진 빌드에서 던지도록 설계돼 있고
   * (`notifications-adapter` 지연 로드 계약), 포그라운드 복귀마다 도는 경로에서 새어 나가면
   * 미처리 거부가 반복된다. 판독 실패는 표시를 바꾸지 않는다.
   */
  const syncFromDevice = useCallback(() => {
    void (async () => {
      try {
        const [devicePermission, storedToken] = await Promise.all([
          readPermissionStatus(),
          fcmTokenStorage.read(),
        ]);
        if (!aliveRef.current) return;
        setPermission(devicePermission);
        setEnabledState(
          derivePushEnabled({
            permission: devicePermission,
            hasStoredToken: storedToken !== null,
          }),
        );
        // 설정에서 권한을 켜고 돌아온 경우 직전 거부는 낡은 사실이다 (기준 13)
        setError((current) => reconcilePushError(current, devicePermission));
      } catch {
        // 네이티브 모듈 부재 — 푸시 없음까지만 퇴화시키고 화면은 그대로 둔다
      }
    })();
  }, []);

  /** 진입 시 현재 상태 판독 — 기기 설정에서 권한을 바꿨을 수 있다 */
  useEffect(() => {
    syncFromDevice();
  }, [syncFromDevice]);

  /** 설정 왕복 복귀 반영 (기준 13) — 우리가 내보낸 사용자가 돌아오는 유일한 신호다 */
  useAppForeground(syncFromDevice);

  const setEnabled = useCallback(async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = next
        ? await enablePush(pushDeps)
        : await disablePush(pushDeps);
      /**
       * 표시는 **실제 상태**를 따른다 (PR #78 리뷰 ②) — 판정은 `resolveToggleDisplay`가
       * 소유한다. OFF 실패는 보관 토큰이 남아 서버 등록이 살아 있으므로 **켜짐**이다.
       */
      setEnabledState(resolveToggleDisplay(next, result.status));
      setError(
        result.status === "denied" || result.status === "failed"
          ? result.status
          : null,
      );
    } finally {
      /**
       * busy 해제는 `finally`에 둔다 (PR #78 리뷰 ①). 위 두 함수는 총함수라 지금은 거부하지
       * 않지만, 그 계약이 깨지면 스위치가 영구히 잠긴 채 남아 사용자가 알림을 켤 수도 끌 수도
       * 없게 된다 — 계약과 무관하게 성립하는 해제 지점을 둔다.
       */
      setBusy(false);
    }
  }, []);

  return { enabled, permission, busy, error, setEnabled };
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
