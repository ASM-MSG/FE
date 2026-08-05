import { View } from "react-native";
import { cx } from "@fillmap/ui-native";

/**
 * 직접 구간 지정 정적 슬라이더 (MSG-303 AC 9, Figma 14094:4312) — 두 핸들과 선택
 * 범위가 채워진 표시 전용 mock. 드래그 불가·값 고정이 정상 (티켓 명시 mock —
 * 라이브러리 미도입, View 조합). 핸들 위치는 Figma 근사(15%·72%).
 */
export const RangeSliderStatic = ({ className }: { className?: string }) => (
  <View className={cx("h-4 w-full justify-center", className)}>
    <View className="h-2 w-full rounded-full bg-surface" />
    <View className="absolute left-[15%] h-2 w-[57%] rounded-full bg-primary/30" />
    <View className="absolute left-[15%] h-4 w-1.5 rounded-full bg-primary" />
    <View className="absolute left-[72%] h-4 w-1.5 rounded-full bg-primary" />
  </View>
);
