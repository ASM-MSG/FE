import {
  playbackUnavailableMessage,
  useVideoPlayback,
} from "@/features/map-home/model/use-video-playback";

interface CoverVideoPlayerProps {
  videoId: number;
}

/**
 * 대표 영상 인라인 플레이어 (MSG-329 후속 — 재생 배선, 모달 아님).
 * 썸네일 자리(aspect-video 박스)를 그대로 차지하고 playbackUrl(READY면 블러본)을
 * controls로 재생한다. 재생 불가(처리 중·FAILED·블라인드)면 같은 자리에 사유를 보여준다.
 * 자동재생은 시도하되 실패는 무시한다(재생 버튼 클릭 직후라 대체로 허용 — VideoMiniPanel 관례).
 */
export const CoverVideoPlayer = ({ videoId }: CoverVideoPlayerProps) => {
  const { data, isLoading, isError } = useVideoPlayback(videoId);

  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-sm bg-foreground">
      {isLoading && (
        <p className="text-fm-caption text-foreground-inverse/70">
          재생 정보를 불러오는 중이에요…
        </p>
      )}
      {isError && (
        <p
          role="alert"
          className="px-md text-center text-fm-caption text-foreground-inverse/70"
        >
          재생 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요
        </p>
      )}
      {data &&
        (data.playbackUrl !== null ? (
          <video
            src={data.playbackUrl}
            controls
            autoPlay
            playsInline
            className="size-full object-contain"
          />
        ) : (
          <p className="px-md text-center text-fm-caption text-foreground-inverse/70">
            {playbackUnavailableMessage(data)}
          </p>
        ))}
    </div>
  );
};
