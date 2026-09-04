import { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { cx } from "@fillmap/ui-native";

export interface UploadVideoPreviewHandle {
  /** 지정 시각(초)으로 seek 후 재생 — 추천 행의 재생 버튼 (기준 17) */
  playFrom: (startSec: number) => void;
}

interface UploadVideoPreviewProps {
  /** 선택한 원본 영상 uri — 없으면(딥링크 진입) 빈 다크 박스 */
  uri: string | null;
  /** 사용자 재생 컨트롤 노출 — 미리보기 최종 확인용 */
  nativeControls?: boolean;
  className?: string;
}

/**
 * 업로드 플로우 영상 프리뷰 (기준 16·19, D3) — `expo-video`의 VideoView 래퍼.
 * Figma의 점선 회색 플레이스홀더는 재현하지 않는다 — 와이어프레임 표기이고, D3가
 * "선택한 영상이 실제로 재생 가능한 상태"를 요구한다(오탐 방지 5).
 * 구간 끝 자동 정지·반복은 범위 밖이다(D3) — 재생 버튼은 시작 시각 seek까지만 책임진다.
 *
 * **expo-video 실측 (구 `blur-preview.tsx` JSDoc에서 이관, MSG-567 A12)** — 소스가 바뀌어도
 * `player.replace*`를 손으로 부르지 않는다. `useVideoPlayer`가 `useReleasingSharedObject(...,
 * [JSON.stringify(parsedSource), …])`로 구현돼 **소스가 바뀌면 기존 플레이어를 해제하고 새로
 * 만든다**(expo-video 57.0.2 `build/VideoPlayer.js:33-40`). 여기에 `replaceAsync`를 더하면
 * 재생성과 교체가 같은 소스를 두 번 로드하며 경합한다 (PR #78 리뷰 ③ 검토 결과 — 기각).
 * `video-player-screen`·`event-video-player`가 이 실측을 참조한다.
 */
export const UploadVideoPreview = forwardRef<
  UploadVideoPreviewHandle,
  UploadVideoPreviewProps
>(function UploadVideoPreview({ uri, nativeControls = false, className }, ref) {
  const player = useVideoPlayer(uri);

  useImperativeHandle(
    ref,
    () => ({
      playFrom: (startSec: number) => {
        player.currentTime = startSec;
        player.play();
      },
    }),
    [player],
  );

  return (
    <View
      className={cx(
        "aspect-video w-full overflow-hidden rounded-lg bg-foreground",
        className,
      )}
    >
      {uri !== null && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={nativeControls}
        />
      )}
    </View>
  );
});
