import { forwardRef, type ReactNode, useImperativeHandle, useRef } from "react";
import { Film } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import type { Segment } from "@/features/upload/model/highlight-selection";

export interface VideoPreviewHandle {
  /** 구간 시작으로 seek 후 자동 재생, 구간 끝에서 정지. (MSG-118 추정 3) */
  playSegment: (segment: Segment) => void;
}

interface VideoPreviewProps {
  /** 미리보기 objectURL — 없으면 플레이스홀더 표시 */
  objectUrl: string | null;
  /** 재생 위치(초) 변경 통보 — 트리머 playhead 갱신용 */
  onTimeUpdate?: (currentTime: number) => void;
  /**
   * 영상 위에 얹을 오버레이 슬롯 — relative 컨테이너 내부에 렌더한다.
   * 미지정이면 아무것도 얹지 않는다(하위 호환).
   */
  overlay?: ReactNode;
  /** 네이티브 재생 컨트롤 표시 — 미리보기 최종 확인·블러 확인 모달용 (MSG-329 B8·B16) */
  controls?: boolean;
  className?: string;
}

/**
 * 선택 영상 미리보기 (플랫폼 <video> 경계). [S3·S5]
 * 실제 재생·seek는 여기서만 일어나고, 구간 계산은 순수 함수가 담당한다.
 * playSegment는 imperative handle로 노출 — 리스트/트리머의 재생 버튼이 호출한다.
 */
export const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(
  ({ objectUrl, onTimeUpdate, overlay, controls, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const stopAtRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      playSegment: (segment) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = segment.start;
        stopAtRef.current = segment.end;
        // autoplay 정책/소스 미준비로 실패해도 unhandled rejection을 남기지 않는다 — UI는 재생 안 됨으로 자연히 드러남
        video.play().catch(() => {});
      },
    }));

    const handleTimeUpdate = () => {
      const video = videoRef.current;
      if (!video) return;
      onTimeUpdate?.(video.currentTime);
      if (
        stopAtRef.current !== null &&
        video.currentTime >= stopAtRef.current
      ) {
        video.pause();
        stopAtRef.current = null;
      }
    };

    return (
      <div
        className={cn(
          "relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-foreground",
          className,
        )}
      >
        {objectUrl ? (
          <video
            ref={videoRef}
            src={objectUrl}
            onTimeUpdate={handleTimeUpdate}
            playsInline
            controls={controls}
            className="size-full object-contain"
          />
        ) : (
          <Film className="size-8 text-foreground-inverse/40" />
        )}
        {overlay}
      </div>
    );
  },
);

VideoPreview.displayName = "VideoPreview";
