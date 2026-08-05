import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Lock, MapPin, Sparkles } from "lucide-react-native";
import { palette, semantic } from "@fillmap/design-tokens";
import { AppHeader, Button, Chip } from "@fillmap/ui-native";
import { LOCATION_FULL_TEXT } from "../model/upload-copy";
import {
  selectSelectedSegment,
  uploadFlowStore,
  useUploadFlow,
} from "../model/upload-flow-store";

/**
 * SOURCE: Figma "업로드 미리보기" (node 14094:4427) — 업로드 플로우 4/4 최종 확인 (MSG-305).
 * 다크 프리뷰(플레이스홀더 폴백 — 추정 4) + 요약 카드 3개. 수정 기능 없는 확인 전용.
 * 하이라이트 카드는 선택 구간의 시간·사유를 동적 반영 (승인 결정 2 — Figma 고정 문구는
 * 첫 구간 예시). 302에서 입력한 제목은 미표시 — Figma 준수 (승인 결정 3).
 * 게시는 mock — API 호출 없이 스토어 reset 후 지도 홈 복귀 (AC 6·7, 게시 완료 피드백
 * 없음 — 추정 2). 게시 후 지도 셀 상태 갱신은 제외 범위 (리스크 1).
 */
export const PreviewScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flow = useUploadFlow();
  const segment = selectSelectedSegment(flow);

  /** 게시 (AC 6·7) — reset 후 홈까지 스택 해제 복귀 (업로드 스택에 남지 않게) */
  const publish = () => {
    uploadFlowStore.reset();
    router.dismissTo("/home");
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="업로드 미리보기" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-md"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* 단계·최종 확인 (AC 2) */}
        <View className="flex-row items-center justify-between">
          <Text className="text-fm-label text-foreground-muted">4/4 단계</Text>
          <Text className="text-fm-body-strong text-foreground">최종 확인</Text>
        </View>

        {/* 다크 프리뷰 (AC 2) — 썸네일 플레이스홀더 폴백, 재생 버튼 없는 순수 표시 (추정 4) */}
        <View className="mt-sm aspect-[8/7] w-full rounded-lg bg-foreground" />

        {/* AI 하이라이트 구간 다크 카드 (AC 3) — 우측 시간 슬롯이 Toast에 없어 화면 전용 조립 */}
        <View className="mt-md w-full flex-row items-start gap-sm rounded-lg bg-foreground py-3.5 pl-3.5 pr-md">
          <View className="size-7.5 items-center justify-center rounded-full bg-primary">
            <Sparkles size={14} color={semantic.onPrimary} />
          </View>
          <View className="flex-1 gap-0.75">
            <View className="flex-row items-center gap-sm">
              <Text className="flex-1 text-fm-base font-semibold text-foreground-inverse">
                AI 하이라이트 구간
              </Text>
              <Text className="text-fm-label text-highlight">
                {segment.timeRange}
              </Text>
            </View>
            <Text className="text-fm-label font-normal text-foreground-inverse/65">
              {segment.reason} 구간이 선택되었습니다
            </Text>
          </View>
        </View>

        {/* 개인정보 자동 블러 카드 (AC 4) — 완료 칩, 블러 개수 미표시 */}
        <View className="mt-sm rounded-lg border border-border bg-surface-soft p-md">
          <View className="flex-row items-center gap-xs">
            <Lock size={14} color={semantic.textPrimary} />
            <Text className="flex-1 text-fm-body-strong text-foreground">
              개인정보 자동 블러
            </Text>
            <Chip text="완료" className="bg-primary/10" />
          </View>
          <Text className="mt-xxs text-fm-label text-foreground-muted">
            영상 전체에 블러 처리가 적용됐어요
          </Text>
        </View>

        {/* 위치 카드 (AC 5) — 302 위치 mock 상수와 단일 출처 */}
        <View className="mt-sm rounded-lg border border-border bg-surface-soft p-md">
          <Text className="text-fm-label text-foreground-muted">위치</Text>
          <View className="mt-xxs flex-row items-center gap-xs">
            <MapPin size={14} color={palette["red-500"]} />
            <Text className="text-fm-body-strong text-foreground">
              {LOCATION_FULL_TEXT}
            </Text>
          </View>
        </View>

        {/* CTA (AC 6·8) */}
        <Button
          text="지금 게시하기"
          shape="pill"
          className="mt-lg w-full"
          onPress={publish}
        />
        <Button
          text="이전 단계로"
          variant="secondary"
          shape="pill"
          className="mt-sm w-full border border-border"
          onPress={() => router.back()}
        />
      </ScrollView>
    </View>
  );
};
