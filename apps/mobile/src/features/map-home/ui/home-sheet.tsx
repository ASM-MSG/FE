import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Pressable, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { NativeGesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { ReactNode } from "react";
import {
  sheetStagePositions,
  snapStage,
  type SheetStage,
} from "../model/sheet-snap";

/**
 * 스냅 스프링 (AC 11 4차 — 반응성 상향): 임계 감쇠(dampingRatio 1 = 오버슈트 없음)에
 * 체감 시간을 직접 지정하는 duration 기반 구성 — 구 물리 파라미터(damping 28/stiffness 260)가
 * 정착까지 굼뜨다는 실기기 피드백의 반영. 220ms면 손을 뗀 즉시 정착으로 체감된다.
 */
const SPRING = { duration: 220, dampingRatio: 1 };

/**
 * 헤더 드래그 존(px) — 핸들(10+4)+gap(12)+헤더 행(19)+gap(12)+다음 행(32)≈89.
 * 이 안에서 시작한 드래그는 콘텐츠 스크롤 가드를 우회한다(헤더 드래그는 항상 시트 이동).
 * 기본·테마 콘텐츠 모두 상단 두 행 구조라 공용 근사값으로 둔다 (MSG-298 쉘 분리).
 */
const HEADER_DRAG_ZONE = 92;

export interface HomeSheetRef {
  /** 지정 단계로 스냅 이동 — 홈 복귀 시 2단계 리셋 등 부모 주도 전환 (AC 10·13) */
  snapTo: (stage: SheetStage) => void;
  /** 4단계(숨김)일 때만 2단계로 복귀 — 홈 탭 재탭 (AC 13, D12) */
  restoreIfHidden: () => void;
}

/**
 * 시트 콘텐츠가 쉘과 접속하는 계약 (MSG-298 — 쉘/콘텐츠 분리).
 * 콘텐츠의 스크롤 뷰는 scrollGesture로 감싸고, scrollEnabled를 따르며,
 * 마운트 시 0과 스크롤마다 오프셋을 onScrollOffsetChange로 보고한다 —
 * 1단계 시트 축소 가드(리스크 1·3)가 이 보고값으로 판정한다.
 */
export interface HomeSheetContentContext {
  /** 콘텐츠 네이티브 스크롤을 시트 Pan과 동시 인식시키는 제스처 */
  scrollGesture: NativeGesture;
  /** 1단계(전체 확장)에서만 콘텐츠 스크롤 허용 */
  scrollEnabled: boolean;
  /** 콘텐츠 스크롤 오프셋 보고 — 콘텐츠 교체(재마운트) 시 0 보고로 가드 스테일 방지 */
  onScrollOffsetChange: (offsetY: number) => void;
}

interface HomeSheetProps {
  /** 컨테이너 하단 오프셋 — 바텀 내비 바 높이 + safe area (내비는 전 단계 상시 노출, AC 16) */
  bottomOffset: number;
  /**
   * 현재 단계 통지 (MSG-423 요구 8) — 내 위치 버튼이 시트에 가리지 않도록 부모가
   * 오프셋을 다시 계산한다. 컨테이너 높이를 함께 넘기는 이유: 시트 상단 y는
   * `sheetStagePositions(containerHeight)[stage]`라 단계만으로는 위치를 알 수 없고,
   * 이 컨테이너를 실제로 측정하는 것은 시트뿐이기 때문이다(부모의 중복 측정 방지).
   * 최초 onLayout에도 한 번 발화한다.
   */
  onStageChange?: (stage: SheetStage, containerHeight: number) => void;
  /** 콘텐츠 렌더 슬롯 — 쉘은 콘텐츠를 모른다 (MSG-298 구현 계획, 후속 셀 선택 콘텐츠 수용) */
  children: (context: HomeSheetContentContext) => ReactNode;
}

/**
 * 4단계 드래그 바텀시트 쉘 (AC 10·11·13~16, D9) — 네이버 지도 앱 방식.
 * RNGH Pan + reanimated로 손가락을 따라 연속 이동, 릴리즈 시 최근접 단계 스냅(sheet-snap).
 * MSG-298에서 쉘(드래그·스냅·핸들)과 콘텐츠를 분리했다 — 콘텐츠는 children 슬롯이
 * 렌더하고(기본: DefaultSheetContent, 테마: ThemeSheetContent), 쉘은 콘텐츠를 모른다.
 * 단계 상태는 시트가 소유하고 부모는 ref 명령(snapTo·restoreIfHidden)만 내린다 —
 * prop 동기화 useEffect가 공유값 수정과 얽히는 것을 피한다 (react-hooks/immutability,
 * grid-map moveTo와 동일한 명령형 핸들 패턴).
 */
export const HomeSheet = forwardRef<HomeSheetRef, HomeSheetProps>(
  function HomeSheet({ bottomOffset, onStageChange, children }, ref) {
    const [containerH, setContainerH] = useState(0);
    const positions = useMemo(
      () => sheetStagePositions(containerH),
      [containerH],
    );

    /** 시트 단계 — 최초 진입 2단계 (AC 10, D11) */
    const [stage, setStage] = useState<SheetStage>(2);

    const translateY = useSharedValue(0);
    const startY = useSharedValue(0);
    /** 콘텐츠 스크롤 오프셋 — 최상단(0)에서만 아래 드래그가 시트 축소로 이어진다 (리스크 1) */
    const scrollY = useSharedValue(0);
    const fromHeader = useSharedValue(false);

    /** 단계 전환 단일 경로 — 스냅 애니메이션 + 상태 갱신 (드래그·부모 명령 공용) */
    const goToStage = (next: SheetStage) => {
      setStage(next);
      onStageChange?.(next, containerH);
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
      onStageChange?.(stage, h);
    };

    /** 릴리즈 → 최근접 단계 스냅 (AC 11·18) */
    const settle = (releaseY: number) => {
      goToStage(snapStage(releaseY, positions));
    };

    // 콘텐츠의 네이티브 스크롤을 RNGH 체계에 편입 — Pan과 동시 인식 (리스크 1)
    const scrollGesture = useMemo(() => Gesture.Native(), []);

    /** 콘텐츠 → 쉘 스크롤 오프셋 보고 — 안정 참조(콘텐츠 마운트 효과의 재발화 방지) */
    const handleScrollOffsetChange = useCallback(
      (offsetY: number) => {
        scrollY.value = offsetY;
      },
      [scrollY],
    );

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
        // 1단계에서 콘텐츠가 스크롤된 상태면 시트는 고정(스크롤이 소비) — 콘텐츠가
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
                {/* 핸들 바 — 시각 전용. 탭 동작은 하단의 48px 오버레이 Pressable이 담당 */}
                <View className="items-center">
                  <View className="h-1 w-9 rounded-full bg-hairline-strong" />
                </View>

                {/* 콘텐츠 슬롯 — 3단계는 PEEK_HEIGHT가 콘텐츠 상단(헤더 행)까지만 노출 */}
                {children({
                  scrollGesture,
                  scrollEnabled: stage === 1,
                  onScrollOffsetChange: handleScrollOffsetChange,
                })}
                {/* 핸들 탭 = 비제스처 확장/축소 대체 수단 (a11y — 구 AC 19 "전체 보기" 폐기 보완).
                    최상위(마지막 자식) 투명 오버레이로 터치 목표 48px 확보 — 시각·레이아웃 불변.
                    콘텐츠 행은 y≈57부터라 48px 오버레이와 겹치지 않는다 */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={stage === 1 ? "시트 접기" : "시트 펼치기"}
                  onPress={() => goToStage(stage === 1 ? 3 : 1)}
                  className="absolute inset-x-0 top-0"
                  style={{ height: 48 }}
                />
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>
    );
  },
);
