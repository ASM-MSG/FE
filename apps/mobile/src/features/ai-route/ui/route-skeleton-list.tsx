import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * 로딩 스켈레톤 카드 3장 (Figma 15751:512) — 결과 카드와 같은 골격(원형 순번 + 3줄).
 * ui-native에 `Skeleton`이 없고 `index.ts`가 잠겨 있어(MSG-420 합의) 화면 로컬이다 —
 * **승격 후보**(웹 `Skeleton`의 ui-native 짝, 두 번째 소비처에서). 막대 폭은 웹과 같이
 * 비율(2/5·3/5·4/5)이다 (§8 오탐 9). 펄스는 reanimated `withRepeat`(opacity 1↔0.5, 2s, UI 스레드 — home-sheet와 같은 라이브러리) (D10).
 */
const SKELETON_ROWS = [0, 1, 2];
const PULSE_MS = 1000;

export const RouteSkeletonList = () => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.5, { duration: PULSE_MS }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View accessibilityLabel="동선 찾는 중" style={pulse}>
      <View className="gap-1.5">
        {SKELETON_ROWS.map((row) => (
          <View
            key={row}
            className="flex-row items-start gap-sm rounded-md bg-surface-soft p-sm"
          >
            <View className="size-7 shrink-0 rounded-full bg-surface" />
            <View className="flex-1 gap-1.5">
              <View className="h-3.5 w-2/5 rounded-full bg-surface" />
              <View className="h-2.5 w-3/5 rounded-full bg-surface" />
              <View className="h-2.5 w-4/5 rounded-full bg-surface" />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};
