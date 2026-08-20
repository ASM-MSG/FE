import { useEffect } from "react";
import {
  ensureForegroundHandler,
  readLastNotificationData,
  subscribeToNotificationTaps,
} from "./notifications-adapter";
import { startNotificationRouting } from "./push-navigation-routing";

/**
 * 알림 탭 → 화면 이동 배선 (MSG-429 기준 16) — 앱 셸 상주.
 * 판정·내성은 `startNotificationRouting`이 소유하고 여기는 네이티브 어댑터를 묶어 넣는다.
 * 라우팅은 주입받는다 (RN 경계 — 이 훅은 라우터를 import하지 않는다).
 */
export const usePushNavigation = (navigate: (route: string) => void): void => {
  useEffect(
    () =>
      startNotificationRouting(
        {
          ensureForegroundHandler,
          readLastNotificationData,
          subscribeToTaps: subscribeToNotificationTaps,
        },
        navigate,
      ),
    [navigate],
  );
};
