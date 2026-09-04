import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import {
  LOAD_MORE_THRESHOLD_PX,
  isNearScrollEnd,
  type ScrollMetrics,
} from "../model/scroll-end";
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
  /**
   * 스크롤 끝 근접(`LOAD_MORE_THRESHOLD_PX`) 시 호출 (MSG-571 AC 8) — 스크롤뿐 아니라
   * 레이아웃·콘텐츠 크기 변화에서도 판정한다: 첫 페이지가 뷰포트를 못 채우면 스크롤
   * 이벤트가 아예 없어 `onScroll`만으로는 영영 이어받지 못한다(codex 리뷰 P2-2). 임계
   * 안에서는 매 이벤트마다 불리므로 연속 발화 가드는 호출부(훅의 loadMore)가 진다
   */
  onEndReached?: () => void;
  children: ReactNode;
}

export const SheetScrollView = ({
  scrollGesture,
  scrollEnabled,
  onScrollOffsetChange,
  resetKey,
  onEndReached,
  children,
}: SheetScrollViewProps) => {
  // 콘텐츠 교체·상태 전환으로 스크롤 뷰가 재마운트되면 오프셋 가드가 스테일해진다 —
  // 새 스크롤 뷰는 항상 0에서 시작한다 (쉘 계약)
  useEffect(() => {
    onScrollOffsetChange(0);
  }, [onScrollOffsetChange, resetKey]);

  // 최근 지표 — 세 이벤트(스크롤·레이아웃·콘텐츠 크기)가 각각 한 축만 갱신하므로 합쳐 둔다
  const metrics = useRef<ScrollMetrics>({
    contentOffset: { y: 0 },
    layoutMeasurement: { height: 0 },
    contentSize: { height: 0 },
  });
  const checkEndReached = () => {
    if (
      onEndReached &&
      isNearScrollEnd(metrics.current, LOAD_MORE_THRESHOLD_PX)
    )
      onEndReached();
  };

  return (
    <GestureDetector gesture={scrollGesture}>
      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onLayout={(event) => {
          metrics.current.layoutMeasurement.height =
            event.nativeEvent.layout.height;
          checkEndReached();
        }}
        onContentSizeChange={(_width, height) => {
          metrics.current.contentSize.height = height;
          checkEndReached();
        }}
        onScroll={(event) => {
          const { contentOffset, layoutMeasurement, contentSize } =
            event.nativeEvent;
          onScrollOffsetChange(contentOffset.y);
          metrics.current = {
            contentOffset: { y: contentOffset.y },
            layoutMeasurement: { height: layoutMeasurement.height },
            contentSize: { height: contentSize.height },
          };
          checkEndReached();
        }}
      >
        <View className="gap-md pb-9">{children}</View>
      </ScrollView>
    </GestureDetector>
  );
};
