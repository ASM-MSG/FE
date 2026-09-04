import { useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  watchPosition,
  type CurrentLocation,
} from "../../../shared/geolocation";

/** 첫 AppState 이벤트 전의 `currentState`는 `unknown`일 수 있다 — 포그라운드로 본다 */
const isForeground = (state: AppStateStatus) =>
  state === "active" || state === "unknown";

/**
 * 뷰-레이어 훅 (expo-router `useFocusEffect` import — RN 재사용 대상 아님, model과 분리).
 *
 * 지도 홈 현재 위치 구독 (MSG-565 D4·D5): **홈 포커스 중 AND 앱 포그라운드**일 때만
 * `watchPosition`을 켠다. 바텀 내비 탭 전환은 `router.navigate`라 홈이 언마운트되지 않고
 * 블러만 되므로 포커스 축이 필요하고, 백그라운드 축은 배터리 요구다. 두 축 어느 쪽이든
 * 빠지면 해제, 복귀하면 재구독.
 *
 * `restart()`는 권한이 **방금** 승인된 시점(초기 `resolveMapCenter`·내 위치 탭)에 부른다 —
 * 어댑터는 권한을 판독만 하므로 거부 상태에서 켜진 구독은 no-op으로 끝나 있다.
 */
export const useCurrentLocation = (): {
  location: CurrentLocation | null;
  restart: () => void;
} => {
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(() =>
    isForeground(AppState.currentState),
  );
  const [epoch, setEpoch] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setForeground(isForeground(state)),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!focused || !foreground) return;
    return watchPosition(setLocation);
  }, [focused, foreground, epoch]);

  const restart = useCallback(() => setEpoch((n) => n + 1), []);

  return { location, restart };
};
