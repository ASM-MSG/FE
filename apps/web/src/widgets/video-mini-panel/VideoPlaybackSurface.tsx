import { type RefObject, useEffect, useRef } from "react";
import { Film } from "lucide-react";
import { Button } from "@fillmap/ui-web";

interface VideoPlaybackSurfaceProps {
  /** 재생 소스 — null이면 조회 상태 분기(로딩·실패·불가)로 폴백 */
  src: string | null;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  /**
   * 조회 성공·소스 null의 사유 문구 (non-READY·BLINDED — MSG-329 병합 승계).
   * null이면 로딩 아이콘 유지. 행사 상세(playbackUrl 항상 존재)는 미사용.
   */
  unavailableMessage?: string | null;
  /** video 엘리먼트 접근 — 재생 속도·PIP 유틸리티 (MSG-520 AC 13) */
  videoRef?: RefObject<HTMLVideoElement | null>;
}

/**
 * 미니 패널 공유 재생 표면 (MSG-326 기준 9·12 → MSG-520 추출) — video 엘리먼트 +
 * 자동재생 시도 + 로딩/실패·재시도/불가 3분기. 기존 `VideoMiniPanel`(홈·도감)과
 * 행사 미니 패널(MSG-520 AC 1)이 같은 재생 경험을 공유한다 — 공개 동작 불변(AC 11).
 * 소스 도착·교체 시 자동재생을 시도하고, autoplay 정책·로드 실패 시엔 무시하고
 * controls 수동 재생으로 폴백한다 (VideoPreview 관례).
 */
export const VideoPlaybackSurface = ({
  src,
  isPending,
  isError,
  onRetry,
  unavailableMessage = null,
  videoRef,
}: VideoPlaybackSurfaceProps) => {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef ?? internalRef;

  useEffect(() => {
    if (src !== null) ref.current?.play()?.catch(() => {});
  }, [src, ref]);

  return (
    <div
      aria-busy={isPending}
      className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-foreground"
    >
      {src !== null ? (
        <video
          ref={ref}
          src={src}
          controls
          playsInline
          className="size-full object-contain"
        />
      ) : isError ? (
        <div className="flex flex-col items-center gap-sm px-md">
          <p className="text-center text-fm-caption text-foreground-inverse">
            영상을 불러오지 못했어요
          </p>
          <Button
            text="다시 시도"
            variant="secondary"
            size="sm"
            onClick={onRetry}
          />
        </div>
      ) : isPending ? (
        <Film aria-hidden className="size-8 text-foreground-inverse/40" />
      ) : unavailableMessage !== null ? (
        // 조회는 성공했는데 소스 null — non-READY(처리 중·실패)·BLINDED (기준 12)
        <p className="px-md text-center text-fm-caption text-foreground-inverse">
          {unavailableMessage}
        </p>
      ) : (
        <Film aria-hidden className="size-8 text-foreground-inverse/40" />
      )}
    </div>
  );
};
