import type { Messaging } from "firebase/messaging";
import { FIREBASE_CONFIG, VAPID_PUBLIC_KEY } from "../config/firebase";
import type { PushCapabilities } from "../model/push-support";
import { buildMessagingSwUrl } from "../model/push-sync";

/**
 * firebase/messaging 격리 경계 (MSG-408) — naver-sdk-loader 관례 미러.
 * 웹 전용 전역(Notification·navigator·window)과 firebase 동적 import는 전부 이 모듈
 * 안에만 둔다 — 훅·모델은 이 경계만 참조하고, 테스트는 이 모듈을 모킹한다
 * (jsdom에 Notification·serviceWorker 부재 — 스펙 리스크 절).
 * firebase는 동적 import라 푸시 미사용 경로(초기 번들)에 실리지 않는다.
 */

/** 전역 능력 스냅숏 판독 — 판정은 model/push-support의 순수 함수가 맡는다 (AC 8) */
export const readPushCapabilities = (): PushCapabilities => ({
  hasNotification: typeof Notification !== "undefined",
  hasServiceWorker:
    typeof navigator !== "undefined" && "serviceWorker" in navigator,
  hasPushManager: typeof window !== "undefined" && "PushManager" in window,
});

/** 현재 알림 권한 — 미지원 환경은 null (렌더·액션 시점 판독, 추정 3) */
export const getPermission = (): NotificationPermission | null =>
  typeof Notification === "undefined" ? null : Notification.permission;

/** 권한 요청 — 반드시 사용자 제스처 컨텍스트에서 호출할 것 (스펙 결정 1) */
export const requestPermission = (): Promise<NotificationPermission> =>
  Notification.requestPermission();

/** onMessage payload 중 FE가 소비하는 부분 — firebase 타입이 경계 밖으로 새지 않게 축약 */
export interface ForegroundMessage {
  title?: string;
  body?: string;
}

let messagingPromise: Promise<Messaging> | null = null;

/** Firebase 앱·메시징 1회 초기화 공유 — 토큰 취득·포그라운드 구독이 같은 인스턴스를 쓴다 */
const getMessagingInstance = (): Promise<Messaging> => {
  messagingPromise ??= (async () => {
    const [{ initializeApp }, { getMessaging }] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
    ]);
    return getMessaging(initializeApp(FIREBASE_CONFIG));
  })();
  return messagingPromise;
};

/**
 * SW 등록 + FCM 토큰 취득 (AC 11·12) — SW는 env를 못 읽어 config를 쿼리스트링으로
 * 전달한다(buildMessagingSwUrl). 같은 URL 재등록은 멱등이다.
 */
export const fetchFcmToken = async (): Promise<string> => {
  const registration = await navigator.serviceWorker.register(
    buildMessagingSwUrl(FIREBASE_CONFIG),
  );
  const [{ getToken }, messaging] = await Promise.all([
    import("firebase/messaging"),
    getMessagingInstance(),
  ]);
  return getToken(messaging, {
    vapidKey: VAPID_PUBLIC_KEY,
    serviceWorkerRegistration: registration,
  });
};

/** 포그라운드 수신 구독 (AC 10) — 해지 함수를 돌려준다 */
export const subscribeForegroundMessages = async (
  handler: (message: ForegroundMessage) => void,
): Promise<() => void> => {
  const [{ onMessage }, messaging] = await Promise.all([
    import("firebase/messaging"),
    getMessagingInstance(),
  ]);
  return onMessage(messaging, (payload) => {
    handler({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });
};
