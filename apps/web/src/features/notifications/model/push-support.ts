/**
 * 브라우저 푸시 지원 판별 (MSG-408 AC 8) — 순수 함수 (RN 재사용 대상).
 * 전역(window·Notification) 판독은 api/messaging(웹 격리 경계)의
 * readPushCapabilities가 맡고, 이 함수는 스냅숏만 판정한다.
 */
export interface PushCapabilities {
  hasNotification: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
}

/** 세 능력이 모두 있어야 웹 푸시(FCM) 지원이다 */
export const isPushSupported = (caps: PushCapabilities): boolean =>
  caps.hasNotification && caps.hasServiceWorker && caps.hasPushManager;
