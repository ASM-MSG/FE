import { useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppHeader, Button } from "@fillmap/ui-native";
import { MANUAL_FALLBACK_NOTICE } from "../model/analysis-copy";
import { formatSegmentLabel } from "../model/highlight-selection";
import { useUploadFlowHydrated } from "../model/upload-flow-persistence";
import {
  selectSelectedSegment,
  uploadFlowStore,
  useUploadFlow,
} from "../model/upload-flow-store";
import { SegmentCard } from "./segment-card";
import { SegmentRangeSlider } from "./segment-range-slider";
import { useHardwareBack } from "./use-hardware-back";
import {
  UploadVideoPreview,
  type UploadVideoPreviewHandle,
} from "./upload-video-preview";

/**
 * SOURCE: Figma "AI 하이라이트 추천" (node 14799:25984) — 기준 10~18.
 * 서버 선분석이 준 추천(최대 3개, 배열 순서 = 우선순위)을 카드로 보여주고, 첫 행이 이미
 * 선택된 상태로 열린다. 직접 구간 지정 슬라이더는 실제 드래그가 되며(구 정적 mock 폐기),
 * 하단 "선택한 구간" 요약이 즉시 따라온다.
 *
 * 현행 대비 사라지는 것들은 전부 의도다: "2/4 단계" 표기는 Figma 정본에 없고(오탐 방지 7),
 * 추천 행의 사유 문구는 서버가 계산하지 않으며(D2·오탐 방지 1), 다음 단계는 블러 확인이
 * 아니라 미리보기다(블러는 업로드 후처리).
 */
export const HighlightScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hydrated = useUploadFlowHydrated();
  const flow = useUploadFlow();
  const previewRef = useRef<UploadVideoPreviewHandle>(null);

  /**
   * 이전 단계로 — 선택 화면으로 되돌리며 진행을 버린다.
   * 헤더 뒤로가기·하단 버튼·하드웨어 백이 **같은 경로**를 쓴다: 백이 이 정리를 우회하면
   * 사용자는 홈을 보는데 영속 스텝은 highlight로 남아 재시작이 업로드 플로우로 재개된다
   * (codex 리뷰 3회차 P2 — 미리보기와 같은 결함 클래스).
   */
  const goBack = () => {
    uploadFlowStore.backToSelect();
    router.replace("/upload");
  };
  useHardwareBack(goBack);

  // 재수화 전에는 렌더하지 않는다 — 복원값 깜빡임 방지 (기준 38)
  if (!hydrated) return <View className="flex-1 bg-background" />;

  const duration = flow.video?.durationSec ?? 0;
  const selected = selectSelectedSegment(flow);
  const selectedAiId =
    flow.selection?.mode === "ai" ? flow.selection.selectedAi.id : null;
  const manualSegment = flow.selection?.manualSegment ?? { start: 0, end: 0 };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <AppHeader title="AI 하이라이트 추천" onBack={goBack} />
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-md"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          <Text className="text-fm-heading text-foreground">
            하이라이트 구간 선택
          </Text>
          <Text className="mt-xxs text-fm-label text-foreground-muted">
            AI가 추천한 최적 구간을 확인하고 선택하세요
          </Text>

          {/* 실 영상 프리뷰 (기준 16) — 점선 플레이스홀더 재현 안 함 (오탐 방지 5) */}
          <UploadVideoPreview
            ref={previewRef}
            className="mt-md"
            uri={flow.video?.uri ?? null}
          />

          {flow.manualFallback ? (
            /* 분석 서버 오류·네트워크 실패 폴백 (기준 32) — 추천 없이 직접 지정으로 진행 */
            <View className="mt-md rounded-md bg-surface-soft px-md py-sm">
              <Text
                accessibilityLiveRegion="polite"
                className="text-fm-label text-foreground-muted"
              >
                {MANUAL_FALLBACK_NOTICE}
              </Text>
            </View>
          ) : (
            <>
              <View className="mt-md flex-row items-center justify-between">
                <Text className="text-fm-body-strong text-foreground">
                  AI 추천 구간
                </Text>
                <Text className="text-fm-label text-foreground-muted">
                  {flow.suggestions.length}개
                </Text>
              </View>
              <View className="mt-xs gap-sm">
                {flow.suggestions.map((suggestion) => (
                  <SegmentCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    selected={suggestion.id === selectedAiId}
                    onPress={() => uploadFlowStore.selectSuggestion(suggestion)}
                    onPlay={() =>
                      previewRef.current?.playFrom(suggestion.start)
                    }
                  />
                ))}
              </View>
            </>
          )}

          {/* 직접 구간 지정 (기준 14·15) — 실제 드래그 슬라이더 */}
          <View className="mt-lg flex-row items-center justify-between">
            <Text className="text-fm-body-strong text-foreground">
              직접 구간 지정
            </Text>
            <Text className="text-fm-label text-foreground-muted">
              {formatSegmentLabel(manualSegment)}
            </Text>
          </View>
          <SegmentRangeSlider
            className="mt-sm"
            duration={duration}
            segment={manualSegment}
            onChange={(segment) => uploadFlowStore.selectManualSegment(segment)}
          />

          {/* 선택 요약 (기준 15) — AI·직접 어느 쪽이든 현재 선택을 반영한다 */}
          <View className="mt-lg flex-row items-center justify-between rounded-md bg-surface-soft px-md py-sm">
            <Text className="text-fm-label text-foreground-muted">
              선택한 구간
            </Text>
            <Text className="text-fm-body-strong text-foreground">
              {selected === null ? "-" : formatSegmentLabel(selected)}
            </Text>
          </View>

          {/* CTA (기준 18) — 미리보기로 전진, /upload/blur는 거치지 않는다 */}
          <Button
            text="이 구간으로 다음 단계"
            shape="pill"
            className="mt-lg w-full"
            disabled={selected === null}
            onPress={() => {
              uploadFlowStore.goPreview();
              router.navigate("/upload/preview");
            }}
          />
          <Button
            text="이전 단계로"
            variant="secondary"
            shape="pill"
            className="mt-sm w-full border border-border"
            onPress={goBack}
          />
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};
