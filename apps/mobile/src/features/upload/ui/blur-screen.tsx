import { useCallback } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Button, Toast } from "@fillmap/ui-native";
import { useBlurPlaybackQuery } from "../api/use-blur-playback-query";
import { parseVideoIdParam, resolveBlurCloseTarget } from "../model/blur-entry";
import { BlurPreview } from "./blur-preview";
import { useHardwareBack } from "./use-hardware-back";

/**
 * SOURCE: Figma "AI 자동 블러 확인" (node 14799:26064) — MSG-429 기준 1~6.
 *
 * **알림 진입 확인 화면이다 — 업로드 위저드의 한 단계가 아니다.** MSG-424가 블러를 서버
 * 후처리로 분리하면서 이 화면은 위저드 경로(`select → analyzing → highlight → preview`)에서
 * 빠졌고, 지금은 완료 통지·푸시를 눌렀을 때 `?videoId`를 달고 진입한다.
 * 그래서 CTA는 위저드 전진(구 "확인 후 다음 단계" → `/upload/preview`)이 아니라 **닫기**다.
 *
 * 정책 존치(MSG-302): 영상 전체 블러 표시 · **블러 개수 미표시** · 영역 편집 없음.
 * 하단 탭바 없음이 정상이다.
 */
export const BlurScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ videoId?: string | string[] }>();
  const videoId = parseVideoIdParam(params.videoId);
  const playback = useBlurPlaybackQuery(videoId);

  /**
   * [확인]·헤더 `‹`·하드웨어 뒤로가기 (기준 4·5) — 전부 같은 닫기 경로를 탄다.
   * 푸시 콜드 스타트로 이 화면이 스택의 유일한 항목이면 `back()`이 무동작이라 사용자가
   * 갇힌다 — 그때는 지도 홈으로 대체 복귀한다.
   */
  const close = useCallback(() => {
    const target = resolveBlurCloseTarget(router.canGoBack());
    if (target.kind === "back") router.back();
    else router.replace(target.route);
  }, [router]);

  useHardwareBack(close);

  const unavailable = videoId === null || playback.isError;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="AI 자동 블러 확인" onBack={close} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pt-md">
        {/* 파라미터 불량·조회 실패는 안내로 종결한다 — 크래시도 무한 스켈레톤도 없다 (기준 2) */}
        {unavailable ? (
          <Text
            accessibilityLiveRegion="polite"
            className="mt-lg text-fm-body text-foreground-muted"
          >
            영상을 불러오지 못했어요. 알림을 다시 눌러 확인해주세요.
          </Text>
        ) : (
          <>
            <BlurPreview
              uri={playback.data?.playbackUrl ?? null}
              durationSec={playback.data?.durationSec ?? null}
            />
            {playback.isPending && (
              <ActivityIndicator
                className="mt-md"
                accessibilityLabel="영상을 불러오는 중"
              />
            )}
            {/* 다크 토스트 (기준 3) — 체크 아이콘 슬롯 */}
            <Toast
              className="mt-md"
              title="AI 자동 블러 완료"
              description="영상 전체에 블러 처리가 적용됐어요"
              icon={
                <Check size={16} strokeWidth={3} color={semantic.onPrimary} />
              }
            />
          </>
        )}
      </ScrollView>
      {/* CTA (기준 4) — Figma 정본 라벨 "확인", 동작은 닫기 */}
      <View
        className="px-5 pt-sm"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button text="확인" shape="pill" className="w-full" onPress={close} />
      </View>
    </View>
  );
};
