import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader } from "@fillmap/ui-native";
import { formatDuration, formatViewCount } from "../../../shared/format";
import { useVideoPlaybackQuery } from "../api/use-video-playback-query";
import {
  playbackAccessNotice,
  playbackOwnerLine,
  playbackTitle,
  playbackUnavailableMessage,
} from "../model/video-playback";

interface VideoPlayerScreenProps {
  videoId: number;
  /** 표기용 소유 신호 — 접근 판정에는 쓰지 않는다 (기준 12, goToVideoPlayback JSDoc) */
  mine: boolean;
}

/**
 * 영상 재생 화면 (MSG-446 기준 6·7·10·12) — 진입점 4곳이 공유하는 **단일** 목적지.
 * 헤더(격자명 + 뒤로) → 16:9 다크 플레이어 → 메타 한 줄(업로더·시점 / 조회·길이).
 *
 * **Figma 시안이 없다** (스펙 리스크) — 레이아웃은 앱에 이미 있는 재생 관례를 따랐다:
 * 다크 16:9 박스 + `contentFit="contain"`(`upload-video-preview`), `AppHeader`(MSG-420).
 * 세로 풀스크린 피드는 티켓 [제외 범위]다.
 *
 * 재생/일시정지·재생 시간은 **`expo-video` 네이티브 컨트롤**이 낸다 (승인 추정 1) —
 * 커스텀 컨트롤은 시안이 없어 전부 추정이 되고, 스크러버 접근성도 직접 만들어야 한다.
 *
 * 소스는 항상 null로 첫 렌더된 뒤 조회 응답으로 채워진다. `player.replace*`를 손으로
 * 부르지 않는 이유는 `blur-preview.tsx` JSDoc에 실측으로 기록돼 있다 — `useVideoPlayer`가
 * 소스 변경 시 플레이어를 재생성하므로 교체를 더하면 같은 소스를 두 번 로드하며 경합한다.
 * 재생성 시 setup 콜백이 다시 돌아 자동 재생이 성립한다 (승인 추정 5).
 */
export const VideoPlayerScreen = ({
  videoId,
  mine,
}: VideoPlayerScreenProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { playback, isPending, isError, error, retry } =
    useVideoPlaybackQuery(videoId);

  const uri = playback?.playbackUrl ?? null;
  const player = useVideoPlayer(uri, (instance) => {
    // 첫 렌더는 항상 소스 null이다(응답 도착 전) — 그때는 재생을 걸지 않는다.
    // 소스가 채워지면 플레이어가 재생성되며 이 콜백이 다시 돌아 자동 재생이 성립한다.
    if (uri !== null) instance.play();
  });

  /**
   * 재생 영역의 상태 문구 — 소스가 없을 때만 그린다.
   * ①조회 실패(403·404·네트워크)는 서버 판정을 그대로 옮기고 ②조회는 됐는데 playbackUrl이
   * null인 경우(처리 중·FAILED·소유자 BLINDED)는 사유를 갈라 알린다.
   */
  const notice = isError
    ? playbackAccessNotice(error)
    : playback && playback.playbackUrl === null
      ? { message: playbackUnavailableMessage(playback), retryable: false }
      : null;

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <AppHeader
        title={playback ? playbackTitle(playback) : "영상"}
        onBack={() => router.back()}
      />

      <View className="aspect-video w-full bg-foreground">
        {uri !== null && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls
          />
        )}

        {notice !== null ? (
          <View className="absolute inset-0 items-center justify-center gap-sm px-lg">
            <Text className="text-center text-fm-body text-foreground-inverse">
              {notice.message}
            </Text>
            {notice.retryable && (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={retry}
                className="active:opacity-60"
              >
                <Text className="text-fm-label text-accent">다시 시도</Text>
              </Pressable>
            )}
          </View>
        ) : (
          uri === null &&
          isPending && (
            <View className="absolute inset-0 items-center justify-center">
              <ActivityIndicator color={semantic.textInverse} />
            </View>
          )
        )}
      </View>

      <View className="gap-xs px-lg py-md">
        {playback && (
          <>
            <Text numberOfLines={1} className="text-fm-body text-foreground">
              {playbackOwnerLine(playback, mine)}
            </Text>
            <Text className="text-fm-caption text-foreground-muted">
              조회 {formatViewCount(playback.viewCount)} ·{" "}
              {formatDuration(playback.durationSec)}
            </Text>
          </>
        )}

        {/* 재생 불가·실패에서 빠져나갈 경로 (기준 10) — 헤더 뒤로가기와 같은 복귀다 */}
        {notice !== null && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            className="self-start active:opacity-60"
          >
            <Text className="text-fm-label text-primary">
              목록으로 돌아가기
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};
