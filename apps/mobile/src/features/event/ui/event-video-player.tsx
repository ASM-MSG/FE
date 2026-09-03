import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { semantic } from "@fillmap/design-tokens";

/**
 * 현장 영상 재생 표면 (MSG-562 D3, Figma 15794:822 `player`) — 16:9 다크 박스 +
 * expo-video 네이티브 컨트롤 + 로딩 + 실패 문구/다시 시도.
 * `video-player-screen.tsx`의 재생 블록을 미러한다 — 그 화면은 `AppHeader` 결합 전면 화면이라
 * 시트 안에 넣을 수 없고, 티켓 [제외 범위]가 그 화면의 무수정을 요구한다(추정 A1).
 *
 * 소스는 항상 null로 첫 렌더된 뒤 상세 응답으로 채워진다. `useVideoPlayer`가 소스 변경 시
 * 플레이어를 재생성하고 언마운트 시 해제한다(`blur-preview.tsx` 실측) — 영상 교체·시트 이탈
 * 시 재생 정지는 마운트 수명으로 성립한다(D11). 재생성 시 setup 콜백이 다시 돌아 자동 재생.
 */
interface EventVideoPlayerProps {
  uri: string | null;
  isPending: boolean;
  isError: boolean;
  /** 상세 재조회 — 조회수 부작용은 사용자 명시 재시도라 수용 */
  onRetry: () => void;
}

export const EventVideoPlayer = ({
  uri,
  isPending,
  isError,
  onRetry,
}: EventVideoPlayerProps) => {
  const player = useVideoPlayer(uri, (instance) => {
    // 첫 렌더는 항상 소스 null이다(응답 도착 전) — 그때는 재생을 걸지 않는다
    if (uri !== null) instance.play();
  });

  return (
    <View className="aspect-video w-full overflow-hidden rounded-md bg-foreground">
      {uri !== null && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls
        />
      )}

      {isError ? (
        <View className="absolute inset-0 items-center justify-center gap-sm px-lg">
          <Text className="text-center text-fm-body text-foreground-inverse">
            영상을 불러오지 못했어요
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onRetry}
            className="active:opacity-60"
          >
            <Text className="text-fm-label text-accent">다시 시도</Text>
          </Pressable>
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
  );
};
