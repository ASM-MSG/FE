import { useEffect } from "react";
import { AppState } from "react-native";

/**
 * 백그라운드 → 포그라운드 복귀 콜백 (MSG-447 기준 13).
 *
 * 이 티켓이 사용자를 **시스템 설정으로 내보내기 때문에** 필요해졌다: 권한을 켜고 돌아왔는데
 * 화면이 낡은 상태 그대로면, 우리가 안내한 동선이 자기 발등을 찍는다.
 *
 * `onForeground`는 **참조가 안정적이어야 한다**(useCallback) — 매 렌더 새 함수를 넘기면
 * 구독이 렌더마다 재설치된다.
 */
export const useAppForeground = (onForeground: () => void): void => {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      onForeground();
    });
    return () => subscription.remove();
  }, [onForeground]);
};
