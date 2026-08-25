import { Platform } from "react-native";
import Constants from "expo-constants";
import { toPermissionState } from "../../../shared/permission-state";
import type { PushPermissionStatus } from "../model/push-registration";

/**
 * `expo-notifications` 격리 경계 (MSG-429 기준 14·15·16) — 네이티브 모듈을 만지는 유일한 지점.
 *
 * **정적 import를 쓰지 않는다 (2026-08-19 실기 환류).** 네이티브 모듈이 빠진 APK에서는
 * `import * as Notifications from "expo-notifications"` **문 자체가 던지고**, 그러면 이 파일을
 * 간접 import하는 `_layout.tsx`가 통째로 평가 실패해 앱 전체가 죽는다(실측). 이 저장소는 구
 * dev client APK와 새 JS가 어긋나는 상황이 반복되므로(MSG-423·425 이력) 로드를 함수 안으로
 * 미루고, 호출부가 실패를 흡수해 "푸시 없음"까지만 퇴화시킨다.
 *
 * 지연 로드는 vitest 격리에도 그대로 유효하다 — 모델·오케스트레이션은 이 파일을 주입받으므로
 * 테스트가 `expo-notifications`를 파싱할 일이 없다(스펙 R6).
 */
type NotificationsModule = typeof import("expo-notifications");

let modulePromise: Promise<NotificationsModule> | null = null;
const loadNotifications = (): Promise<NotificationsModule> =>
  (modulePromise ??= import("expo-notifications"));

/**
 * 포그라운드에서도 알림 배너를 띄운다 — 앱을 보고 있을 때 완료를 놓치지 않게 (기준 16).
 * 최초 1회만 등록한다.
 */
let handlerReady = false;
export const ensureForegroundHandler = async (): Promise<void> => {
  if (handlerReady) return;
  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  handlerReady = true;
};

/** 현재 권한 상태 — 요청하지 않고 읽기만 한다 */
export const readPermissionStatus = async (): Promise<PushPermissionStatus> => {
  const { granted, canAskAgain } = await (
    await loadNotifications()
  ).getPermissionsAsync();
  // MSG-447: 3상태 매핑은 위치 축과 공유한다 (결정 D2) — 동작은 종전과 동일
  return toPermissionState({ granted, canAskAgain });
};

/**
 * 권한 요청 — **사용자 제스처(토글 ON) 컨텍스트에서만 부른다**(승인 D2).
 * 앱 기동 시 자동 프롬프트는 만들지 않는다: 거부되면 되살릴 진입점이 사라진다.
 */
export const requestPermission = async (): Promise<PushPermissionStatus> => {
  const { granted, canAskAgain } = await (
    await loadNotifications()
  ).requestPermissionsAsync();
  return toPermissionState({ granted, canAskAgain });
};

/**
 * FCM **기기 토큰** — Expo 푸시 토큰이 아니다. 서버(`POST /api/notifications/tokens`)가
 * FCM 토큰을 직접 받는 계약이라 발송이 Expo 서비스를 거치지 않는다.
 * Play 서비스 부재·설정 누락 등으로 실패할 수 있어 호출부가 흡수한다.
 */
export const readDevicePushToken = async (): Promise<string> =>
  String((await (await loadNotifications()).getDevicePushTokenAsync()).data);

/** 서버 계약의 platform 값 — iOS 확장 시 이 파생만 늘어난다 (스펙 추정 6) */
export const devicePlatform = (): string =>
  Platform.OS === "ios" ? "IOS" : "ANDROID";

/** 토큰 등록 body의 선택 필드 (스펙 추정 7) */
export const appVersion = (): string | undefined =>
  Constants.expoConfig?.version ?? undefined;

/** 알림 탭 응답 구독 — 해지 함수를 돌려준다 */
export const subscribeToNotificationTaps = async (
  onTap: (data: unknown) => void,
): Promise<() => void> => {
  const subscription = (
    await loadNotifications()
  ).addNotificationResponseReceivedListener((response) =>
    onTap(response.notification.request.content.data),
  );
  return () => subscription.remove();
};

/**
 * 앱이 종료된 상태에서 알림 탭으로 실행됐을 때의 최초 응답 (기준 16 콜드 스타트).
 * 구독은 마운트 이후의 탭만 받으므로 이 조회가 없으면 콜드 스타트 진입이 통째로 누락된다.
 */
export const readLastNotificationData = async (): Promise<unknown> =>
  (await (await loadNotifications()).getLastNotificationResponseAsync())
    ?.notification.request.content.data ?? null;
