import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Play, ShieldCheck } from "lucide-react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { semantic } from "@fillmap/design-tokens";
import { durationLabel } from "../model/duration-label";
import type { UploadVideo } from "../model/upload-flow-store";

interface BlurPreviewProps {
  video: UploadVideo | null;
}

/**
 * 블러 확인 프리뷰 (MSG-304 AC 2~4, Figma 14094:4392) — 세로 대형 다크 프리뷰.
 * 재생 전: 중앙 재생 버튼 + "영상 전체에 블러 적용됨" 배지(방패) + 우하단 길이 뱃지.
 * 재생 버튼 탭: 스토어의 선택 영상(원본)을 "블러 처리본 mock"으로 실재생 — 시각적
 * 블러 효과 없음이 정상 (승인 결정 1, 오탐 방지 1). 재생 중에는 배지·재생 버튼을
 * 숨기고 길이 뱃지만 유지 (추정 2). 영상 없으면(딥링크) 탭 무동작 (추정 3).
 */
export const BlurPreview = ({ video }: BlurPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(video?.uri ?? null);

  const handlePlay = () => {
    if (!video) return;
    player.play();
    setPlaying(true);
  };

  return (
    <View className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-foreground">
      {video && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      )}
      {!playing && (
        <View
          pointerEvents="box-none"
          className="absolute inset-0 items-center justify-center gap-md"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="블러 처리된 영상 재생"
            onPress={handlePlay}
            className="size-14 items-center justify-center rounded-full bg-white/90 active:opacity-80"
          >
            <Play
              size={22}
              color={semantic.textPrimary}
              fill={semantic.textPrimary}
            />
          </Pressable>
          <View className="flex-row items-center gap-xxs rounded-full bg-white/15 px-sm py-1.5">
            <ShieldCheck size={14} color={semantic.textInverse} />
            <Text className="text-fm-label text-foreground-inverse">
              영상 전체에 블러 적용됨
            </Text>
          </View>
        </View>
      )}
      {/* 길이 뱃지 (AC 4) — 실 durationSec mm:ss, 없으면 "0:42" 폴백. 재생 중에도 유지 */}
      <View className="absolute bottom-3 right-3 rounded-sm border border-white/25 bg-foreground/70 px-1.5 py-0.5">
        <Text className="text-fm-caption text-primary-foreground">
          {durationLabel(video?.durationSec ?? null)}
        </Text>
      </View>
    </View>
  );
};
