import { useEffect } from "react";
import { ensureForegroundHandler } from "./notifications-adapter";
import { registerPushForegroundHandler } from "./push-foreground-handler";

/**
 * 포그라운드 배너 핸들러 배선 (MSG-429 기준 14 → MSG-567 축소) — 앱 셸 상주, 마운트 시 1회.
 * 내성은 `registerPushForegroundHandler`가 소유하고 여기는 네이티브 어댑터를 묶어 넣는다.
 */
export const usePushForegroundHandler = (): void => {
  useEffect(() => {
    registerPushForegroundHandler({ ensureForegroundHandler });
  }, []);
};
