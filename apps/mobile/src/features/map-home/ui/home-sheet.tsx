import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Chip } from "@fillmap/ui-native";
import {
  MOCK_GRID_COUNT,
  MOCK_GRID_VIDEOS,
  MOCK_VIDEO_TOTAL,
} from "../model/mock-grid-videos";
import { sortGridVideos, type GridVideoSort } from "../model/sort-grid-videos";
import {
  sheetStagePositions,
  snapStage,
  type SheetStage,
} from "../model/sheet-snap";
import { GridVideoCard } from "./grid-video-card";

/** 스냅 스프링 — 오버슈트 없이 빠르게 정착 */
const SPRING = { damping: 28, stiffness: 260 };

/**
 * 헤더 드래그 존(px) — 핸들(10+4)+gap(12)+타이틀(19)+gap(12)+정렬 칩(32)≈89.
 * 이 안에서 시작한 드래그는 그리드 스크롤 가드를 우회한다(헤더 드래그는 항상 시트 이동).
 */
const HEADER_DRAG_ZONE = 92;

export interface HomeSheetRef {
  /** 지정 단계로 스냅 이동 — 홈 복귀 시 2단계 리셋 등 부모 주도 전환 (AC 10·13) */
  snapTo: (stage: SheetStage) => void;
  /** 4단계(숨김)일 때만 2단계로 복귀 — 홈 탭 재탭 (AC 13, D12) */
  restoreIfHidden: () => void;
}

interface HomeSheetProps {
  /** 컨테이너 하단 오프셋 — 바텀 내비 바 높이 + safe area (내비는 전 단계 상시 노출, AC 16) */
  bottomOffset: number;
}

/**
 * 4단계 드래그 바텀시트 (AC 10·11·13~16·19, D9) — 네이버 지도 앱 방식.
 * RNGH Pan + reanimated로 손가락을 따라 연속 이동, 릴리즈 시 최근접 단계 스냅(sheet-snap).
 * ui-native BottomSheet는 정적 쉘이라 컨테이너는 자체 구현하되 핸들·라운드 등
 * 스타일 토큰 계열은 동일하게 유지한다 (스펙 구현 계획).
 * 콘텐츠: 1~2단계 = 확장(헤더·정렬 칩·2열 그리드), 3단계 = 피크(요약·전체 보기·가로 썸네일),
 * 4단계 = 완전 숨김(그립 없음 — 복귀는 홈 탭 재탭, D12).
 * 단계 상태는 시트가 소유하고 부모는 ref 명령(snapTo·restoreIfHidden)만 내린다 —
 * prop 동기화 useEffect가 공유값 수정과 얽히는 것을 피한다 (react-hooks/immutability,
 * grid-map moveTo와 동일한 명령형 핸들 패턴).
 */
export const HomeSheet = forwardRef<HomeSheetRef, HomeSheetProps>(
  function HomeSheet({ bottomOffset }, ref) {
    const [containerH, setContainerH] = useState(0);
    const positions = useMemo(
      () => sheetStagePositions(containerH),
      [containerH],
    );

    /** 시트 단계 — 최초 진입 2단계 (AC 10, D11) */
    const [stage, setStage] = useState<SheetStage>(2);
    const [sort, setSort] = useState<GridVideoSort>("popular");
    const videos = sortGridVideos(MOCK_GRID_VIDEOS, sort);

    const translateY = useSharedValue(0);
    const startY = useSharedValue(0);
    /** 그리드 스크롤 오프셋 — 최상단(0)에서만 아래 드래그가 시트 축소로 이어진다 (리스크 1) */
    const scrollY = useSharedValue(0);
    const fromHeader = useSharedValue(false);

    /** 단계 전환 단일 경로 — 스냅 애니메이션 + 상태 갱신 (드래그·전체 보기·부모 명령 공용) */
    const goToStage = (next: SheetStage) => {
      setStage(next);
      // 확장 콘텐츠(그리드)가 언마운트되면 스크롤 오프셋도 0으로 — 재확장 시 가드 오작동 방지
      if (next >= 3) scrollY.value = 0;
      // 측정 전(마운트 직후 focus 리셋)이면 상태만 — 위치는 최초 onLayout이 잡는다
      if (containerH === 0) return;
      translateY.value = withSpring(positions[next], SPRING);
    };

    useImperativeHandle(ref, () => ({
      snapTo: goToStage,
      restoreIfHidden: () => {
        if (stage === 4) goToStage(2);
      },
    }));

    const handleLayout = (event: LayoutChangeEvent) => {
      const h = event.nativeEvent.layout.height;
      // 최초 측정: 애니메이션 없이 현 단계 위치로 즉시 배치 (진입 플래시 방지)
      translateY.value = sheetStagePositions(h)[stage];
      setContainerH(h);
    };

    /** 릴리즈 → 최근접 단계 스냅 (AC 11·18) */
    const settle = (releaseY: number) => {
      goToStage(snapStage(releaseY, positions));
    };

    // 그리드의 네이티브 스크롤을 RNGH 체계에 편입 — Pan과 동시 인식 (리스크 1)
    const scrollGesture = Gesture.Native();

    const pan = Gesture.Pan()
      .activeOffsetY([-8, 8])
      .failOffsetX([-16, 16])
      .simultaneousWithExternalGesture(scrollGesture)
      .onBegin((event) => {
        fromHeader.value = event.y <= HEADER_DRAG_ZONE;
      })
      .onStart(() => {
        startY.value = translateY.value;
      })
      .onUpdate((event) => {
        // 1단계에서 그리드가 스크롤된 상태면 시트는 고정(스크롤이 소비) — 그리드가
        // 최상단(0)으로 돌아온 뒤부터 아래 드래그가 시트 축소로 이어지도록
        // 시작점을 계속 재보정한다. 헤더에서 시작한 드래그는 항상 시트를 움직인다.
        if (
          !fromHeader.value &&
          translateY.value <= positions[1] + 1 &&
          scrollY.value > 0
        ) {
          startY.value = positions[1] - event.translationY;
          return;
        }
        translateY.value = Math.min(
          Math.max(startY.value + event.translationY, positions[1]),
          positions[4],
        );
      })
      .onEnd(() => {
        // Reanimated 4: UI 스레드 → JS 스레드 예약은 worklets의 scheduleOnRN (runOnJS 후계)
        scheduleOnRN(settle, translateY.value);
      });

    const sheetStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const expanded = stage <= 2;

    return (
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0"
        // overflow 클립: 4단계에서 컨테이너 바닥 아래로 넘친 시트가 바텀 내비 아래 투명 인셋에 비치지 않게 (AC 16 "완전 숨김")
        style={{ bottom: bottomOffset, overflow: "hidden" }}
        onLayout={handleLayout}
      >
        {containerH > 0 && (
          <GestureDetector gesture={pan}>
            <Animated.View
              pointerEvents={stage === 4 ? "none" : "auto"}
              style={[
                {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  // 1단계에서 컨테이너 바닥까지 정확히 차는 높이 — 하위 단계에선 바닥 아래로 넘친다
                  height: containerH - positions[1],
                },
                sheetStyle,
              ]}
            >
              <View className="flex-1 gap-sm rounded-t-xl bg-surface-elevated px-md pt-2.5 shadow-sheet">
                <View className="items-center">
                  <View className="h-1 w-9 rounded-full bg-hairline-strong" />
                </View>

                {expanded ? (
                  <View className="flex-1 gap-sm">
                    <View className="flex-row items-center">
                      <Text className="flex-1 text-fm-title text-foreground">
                        서면 격자
                      </Text>
                      <Text className="text-fm-label text-foreground-muted">
                        {MOCK_GRID_COUNT}개
                      </Text>
                    </View>
                    <View className="flex-row gap-xs">
                      <Chip
                        text="인기순"
                        active={sort === "popular"}
                        onPress={() => setSort("popular")}
                      />
                      <Chip
                        text="최신순"
                        active={sort === "latest"}
                        onPress={() => setSort("latest")}
                      />
                    </View>
                    <GestureDetector gesture={scrollGesture}>
                      <ScrollView
                        style={{ flex: 1 }}
                        scrollEnabled={stage === 1}
                        bounces={false}
                        overScrollMode="never"
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        onScroll={(event) => {
                          scrollY.value = event.nativeEvent.contentOffset.y;
                        }}
                      >
                        <View className="flex-row flex-wrap justify-between gap-y-md pb-9">
                          {videos.map((video) => (
                            <GridVideoCard
                              key={video.id}
                              video={video}
                              size="lg"
                              showDuration
                              className="w-[48%]"
                            />
                          ))}
                        </View>
                      </ScrollView>
                    </GestureDetector>
                  </View>
                ) : (
                  <View className="gap-sm">
                    <View className="flex-row items-center gap-xs">
                      <Text
                        numberOfLines={1}
                        className="flex-1 text-fm-title text-foreground"
                      >
                        이 지역 격자 {MOCK_GRID_COUNT}개 · 영상{" "}
                        {MOCK_VIDEO_TOTAL}개
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => goToStage(1)}
                        className="active:opacity-60"
                      >
                        <Text className="text-fm-label text-primary">
                          전체 보기
                        </Text>
                      </Pressable>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerClassName="gap-2.5 pb-5"
                    >
                      {/* 피크 썸네일 mock 6건 고정(D5) — 규칙 문서 suppress-when(10행 미만 고정 배열) 해당 */}
                      {/* react-doctor-disable-next-line react-doctor/rn-no-scrollview-mapped-list */}
                      {MOCK_GRID_VIDEOS.map((video) => (
                        <GridVideoCard
                          key={video.id}
                          video={video}
                          className="w-28"
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    );
  },
);
