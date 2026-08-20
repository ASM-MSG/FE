import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Play, ShieldCheck } from "lucide-react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { semantic } from "@fillmap/design-tokens";
import { durationLabel } from "../model/duration-label";

interface BlurPreviewProps {
  /** 재생본(블러 처리본) URL — 조회 전·실패·READY 이전이면 null */
  uri: string | null;
  durationSec: number | null;
}

/**
 * 블러 확인 프리뷰 (MSG-429 기준 1·3, Figma 14799:26071) — 세로 대형 다크 프리뷰.
 * 재생 전: 중앙 재생 버튼 + "영상 전체에 블러 적용됨" 배지(방패) + 우하단 길이 뱃지.
 * 재생 중에는 배지·재생 버튼을 숨기고 길이 뱃지만 유지한다. 소스가 없으면 탭 무동작.
 *
 * **MSG-302에서 달라진 점**: 재생 소스가 업로드 플로우 스토어의 **로컬 원본**에서 서버가
 * 준 **`playbackUrl`(실제 블러 처리본)**으로 바뀌었다. 종전 주석의 "블러 처리본 mock"·
 * "시각적 블러 효과 없음이 정상"은 더 이상 유효하지 않다 — 이제 진짜 처리본이 재생된다.
 *
 * Figma 정본에는 중앙 재생 버튼이 없으나 존치한다(스펙 Figma 오탐 방지 1) — 처리 결과를
 * 눈으로 확인시키는 것이 이 화면의 목적이고, 소스가 처리본이 된 지금 재생의 의미가 생겼다.
 *
 * **`uri`는 항상 null로 첫 렌더된 뒤 조회 응답으로 채워진다** — 그래도 `player.replace*`를
 * 손으로 부르지 않는다. `useVideoPlayer`가 `useReleasingSharedObject(..., [JSON.stringify(
 * parsedSource), …])`로 구현돼 **소스가 바뀌면 기존 플레이어를 해제하고 새로 만든다**
 * (expo-video 57.0.2 `build/VideoPlayer.js:33-40` 실측). 여기에 `replaceAsync`를 더하면
 * 재생성과 교체가 같은 소스를 두 번 로드하며 경합한다 (PR #78 리뷰 ③ 검토 결과 — 기각).
 */
export const BlurPreview = ({ uri, durationSec }: BlurPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(uri);

  const handlePlay = () => {
    if (uri === null) return;
    player.play();
    setPlaying(true);
  };

  return (
    <View className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-foreground">
      {uri !== null && (
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
          {/* 개수는 표시하지 않는다 — "전체 적용"이 정책이다 (기준 3) */}
          <View className="flex-row items-center gap-xxs rounded-full bg-white/15 px-sm py-1.5">
            <ShieldCheck size={14} color={semantic.textInverse} />
            <Text className="text-fm-label text-foreground-inverse">
              영상 전체에 블러 적용됨
            </Text>
          </View>
        </View>
      )}
      {/* 길이 뱃지 — 서버 durationSec mm:ss, 없으면 "0:42" 폴백. 재생 중에도 유지 */}
      <View className="absolute bottom-3 right-3 rounded-sm border border-white/25 bg-foreground/70 px-1.5 py-0.5">
        <Text className="text-fm-caption text-primary-foreground">
          {durationLabel(durationSec)}
        </Text>
      </View>
    </View>
  );
};
