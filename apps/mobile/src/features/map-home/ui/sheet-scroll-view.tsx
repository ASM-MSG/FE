import { useEffect } from "react";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import type { HomeSheetContentContext } from "./home-sheet";

/**
 * 시트 콘텐츠 스크롤 영역 (MSG-427) — 쉘 계약(`HomeSheetContentContext`) 배선 공용.
 *
 * 이 티켓이 시트 콘텐츠를 5종으로 늘리면서 같은 배선(제스처 동시 인식 · scrollEnabled ·
 * 오프셋 보고 · 재마운트 시 0 보고)이 5번 반복되게 됐다 — 한 곳으로 모은다.
 * 배선을 빠뜨리면 1단계 시트 축소 가드가 스테일해져 드래그가 먹히지 않는다(MSG-298 리스크 1).
 */
interface SheetScrollViewProps extends HomeSheetContentContext {
  /** 콘텐츠 교체를 알리는 키 — 바뀌면 스크롤 오프셋 0을 다시 보고한다 */
  resetKey?: unknown;
  children: ReactNode;
}

export const SheetScrollView = ({
  scrollGesture,
  scrollEnabled,
  onScrollOffsetChange,
  resetKey,
  children,
}: SheetScrollViewProps) => {
  // 콘텐츠 교체·상태 전환으로 스크롤 뷰가 재마운트되면 오프셋 가드가 스테일해진다 —
  // 새 스크롤 뷰는 항상 0에서 시작한다 (쉘 계약)
  useEffect(() => {
    onScrollOffsetChange(0);
  }, [onScrollOffsetChange, resetKey]);

  return (
    <GestureDetector gesture={scrollGesture}>
      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          onScrollOffsetChange(event.nativeEvent.contentOffset.y);
        }}
      >
        <View className="gap-md pb-9">{children}</View>
      </ScrollView>
    </GestureDetector>
  );
};
