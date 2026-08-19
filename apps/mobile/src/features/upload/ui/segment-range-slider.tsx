import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { cx } from "@fillmap/ui-native";
import {
  adjustEndHandle,
  adjustStartHandle,
  type Segment,
} from "../model/highlight-selection";

interface SegmentRangeSliderProps {
  /** 원본 영상 길이(초) — 트랙 전체 폭이 이 길이다 */
  duration: number;
  segment: Segment;
  /** 핸들 드래그 결과 — clamp는 highlight-selection이 한다 (기준 14) */
  onChange: (segment: Segment) => void;
  className?: string;
}

/** 핸들 터치 목표 폭(px 스케일 클래스 w-6 = 24px)의 절반 — 트랙 좌표 보정용 */
const HANDLE_HALF = 12;

/**
 * 컴포넌트 밖에 두는 이유: 여기서 만든 제스처를 useMemo로 고정하는데, 팩토리가 렌더마다
 * 새로 만들어지면 그 자체가 deps에 얽혀 고정이 무의미해진다. 인자 둘 다 안정적 콜백이다.
 */
const createPanGesture = (begin: () => void, apply: (dx: number) => void) =>
  Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      scheduleOnRN(begin);
    })
    .onUpdate((event) => {
      // Reanimated 4: UI 스레드 → JS 스레드 예약은 worklets의 scheduleOnRN (home-sheet 선례)
      scheduleOnRN(apply, event.translationX);
    });

/**
 * 직접 구간 지정 두 핸들 슬라이더 (기준 14·15, D5) — 구 `range-slider-static`을 대체한다
 * (그쪽은 핸들 위치가 15%/72%로 하드코딩된 표시 전용 View 조합이었다).
 *
 * 새 의존성 없이 이미 있는 RNGH Pan + worklets로 구현한다 — `@react-native-community/slider`는
 * 단일 핸들이라 범위 슬라이더에 부적합하다. UI 스레드에서는 이동량(px)만 얻고, 초 환산과
 * clamp 판정은 JS 스레드의 순수 모델(adjustStartHandle·adjustEndHandle)에 맡긴다:
 * 판정을 worklet으로 복제하면 웹과의 동등성(parity)이 깨진다.
 *
 * 사용처가 여기 한 곳뿐이라 feature 로컬에 둔다 — 두 번째 사용처가 생기면 ui-native로
 * 승격한다(스펙 승격 후보, MSG-421 히어로 카드 선례).
 */
export const SegmentRangeSlider = ({
  duration,
  segment,
  onChange,
  className,
}: SegmentRangeSliderProps) => {
  const [trackWidth, setTrackWidth] = useState(0);
  /** 드래그 시작 시점의 구간 — 이동량은 이 기준점에 더한다(프레임마다 누적되는 오차 방지) */
  const origin = useRef<Segment>(segment);
  /**
   * 드래그 중 읽을 최신 props. 제스처 객체를 매 렌더 새로 만들면 `GestureDetector`가
   * 네이티브 핸들러를 재부착할 수 있는데, 드래그는 매 프레임 onChange → 리렌더를 부르므로
   * 그 재부착이 드래그 내내 반복된다(RNGH 문서가 제스처 identity 고정을 권장하는 이유).
   * 최신 값은 이 상자로 읽고 제스처는 아래 useMemo로 고정한다.
   */
  const latest = useRef({ segment, duration, trackWidth, onChange });
  useEffect(() => {
    latest.current = { segment, duration, trackWidth, onChange };
  });

  const beginDrag = useCallback(() => {
    origin.current = latest.current.segment;
  }, []);
  const toSeconds = (px: number) => {
    const { duration: seconds, trackWidth: width } = latest.current;
    return width > 0 ? (px / width) * seconds : 0;
  };
  const dragStartHandle = useCallback((dx: number) => {
    latest.current.onChange(
      adjustStartHandle(origin.current, origin.current.start + toSeconds(dx)),
    );
  }, []);
  const dragEndHandle = useCallback((dx: number) => {
    latest.current.onChange(
      adjustEndHandle(
        origin.current,
        origin.current.end + toSeconds(dx),
        latest.current.duration,
      ),
    );
  }, []);

  // 콜백 3종이 전부 안정적 identity라 제스처도 마운트 동안 하나로 고정된다
  const startGesture = useMemo(
    () => createPanGesture(beginDrag, dragStartHandle),
    [beginDrag, dragStartHandle],
  );
  const endGesture = useMemo(
    () => createPanGesture(beginDrag, dragEndHandle),
    [beginDrag, dragEndHandle],
  );

  const ratio = (seconds: number) =>
    duration > 0 ? Math.min(Math.max(seconds / duration, 0), 1) : 0;
  const startRatio = ratio(segment.start);
  const endRatio = ratio(segment.end);

  const handleStyle = (position: number) => ({
    left: Math.max(position * trackWidth - HANDLE_HALF, 0),
  });

  return (
    <View
      className={cx("h-6 w-full justify-center", className)}
      onLayout={(event: LayoutChangeEvent) =>
        setTrackWidth(event.nativeEvent.layout.width)
      }
    >
      <View className="h-2 w-full rounded-full bg-surface" />
      {/* 선택 범위 — 폭은 비율이라 클래스로 표현할 수 없어 style로 지정한다 (ProgressBar 선례) */}
      <View
        className="absolute h-2 rounded-full bg-primary/30"
        style={{
          left: startRatio * trackWidth,
          width: Math.max((endRatio - startRatio) * trackWidth, 0),
        }}
      />
      <GestureDetector gesture={startGesture}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="구간 시작 조절"
          className="absolute h-6 w-6 items-center justify-center"
          style={handleStyle(startRatio)}
        >
          <View className="h-6 w-1.5 rounded-full bg-primary" />
        </View>
      </GestureDetector>
      <GestureDetector gesture={endGesture}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="구간 끝 조절"
          className="absolute h-6 w-6 items-center justify-center"
          style={handleStyle(endRatio)}
        >
          <View className="h-6 w-1.5 rounded-full bg-primary" />
        </View>
      </GestureDetector>
    </View>
  );
};
