import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppHeader, Button } from "@fillmap/ui-native";
import { MOCK_SEGMENTS } from "../model/mock-segments";
import { uploadFlowStore, useUploadFlow } from "../model/upload-flow-store";
import { RangeSliderStatic } from "./range-slider-static";
import { SegmentCard } from "./segment-card";

/**
 * SOURCE: Figma "AI 하이라이트 추천" (node 14094:4312) — 업로드 플로우 2/4 (MSG-303).
 * 다크 프리뷰(썸네일 없는 폴백 — 오탐 방지 1) 아래 mock 추천 구간 5개 중 단일 선택.
 * 직접 구간 지정 슬라이더는 표시만(mock). 영상 없이 직접 진입해도 가드 없이 렌더
 * (추정 3 — 프리뷰는 어차피 다크 폴백). 하단 탭바 없음이 정상 (플로우 내부 화면).
 */
export const HighlightScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedSegmentId } = useUploadFlow();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="AI 하이라이트 추천" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-md"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* 섹션 제목·부제 (AC 2) */}
        <Text className="text-fm-heading text-foreground">
          하이라이트 구간 선택
        </Text>
        <Text className="mt-xxs text-fm-label text-foreground-muted">
          AI가 추천한 최적 구간을 확인하고 선택하세요 · 2/4 단계
        </Text>

        {/* 16:9 다크 프리뷰 (AC 3) — 썸네일 없는 다크 폴백 (오탐 방지 1) */}
        <View className="mt-md aspect-video w-full rounded-lg bg-foreground" />

        {/* AI 추천 구간 목록 (AC 4·5) — 탭 시 단일 선택 전이 (AC 7·8) */}
        <Text className="mt-md text-fm-label text-foreground-muted">
          AI 추천 구간
        </Text>
        <View className="mt-xs gap-sm">
          {MOCK_SEGMENTS.map((segment) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              selected={segment.id === selectedSegmentId}
              onPress={() => uploadFlowStore.selectSegment(segment.id)}
            />
          ))}
        </View>

        {/* 직접 구간 지정 (AC 9) — 정적 mock 고정 문자열 (추정 2) */}
        <View className="mt-lg flex-row items-center justify-between">
          <Text className="text-fm-body-strong text-foreground">
            직접 구간 지정
          </Text>
          <Text className="text-fm-label text-foreground-muted">
            0:12 – 0:42 · 30초
          </Text>
        </View>
        <RangeSliderStatic className="mt-sm" />

        {/* CTA (AC 10) — 블러 확인으로 전진 */}
        <Button
          text="이 구간으로 다음 단계"
          shape="pill"
          className="mt-lg w-full"
          onPress={() => router.navigate("/upload/blur")}
        />
      </ScrollView>
    </View>
  );
};
