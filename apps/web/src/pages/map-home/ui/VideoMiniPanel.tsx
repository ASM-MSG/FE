import { useEffect, useRef } from "react";
import { Film, X } from "lucide-react";
import type { VideoMiniSelection } from "@/features/map-home/model/video-mini-panel-store";
import { formatViewCountKo } from "@/shared/format";
import { VideoOwnerMeta } from "./VideoOwnerMeta";

interface VideoMiniPanelProps {
  /** 미니 패널 선택 — 영상 데이터 + 내 영상 여부 (video-mini-panel-store) */
  selected: VideoMiniSelection;
  /** 닫기 버튼 배선 — Escape 우선 닫기는 페이지 레벨 래핑이 담당 (3차 AC 13) */
  onClose: () => void;
}

/**
 * 영상 미니 디테일 패널 (MSG-277 3차 AC 5·6·8~11) — 네이버 지도 PC 보조 패널 방식.
 * 좌측 패널(w-97) 오른쪽에 flush로 붙는 전고 보조 패널 — 배경 지도 조작은 차단하지 않는다
 * (백드롭 없음). 구성: 닫기 버튼 → 재생 영역(HTML5 video controls, videoSrc 없으면 Film
 * 플레이스홀더) → 메타(제목·소유 문구·시간·조회수 — 소유 문구는 VideoOwnerMeta 공용, 추정 5).
 * 열릴 때(마운트) 포커스를 닫기 버튼으로 옮기고, 카드 교체(리렌더)에는 옮기지 않는다 (AC 6).
 * 접힘 시에는 셸의 display:none 래퍼로 좌측 패널과 함께 숨는다 (추정 9).
 */
export const VideoMiniPanel = ({ selected, onClose }: VideoMiniPanelProps) => {
  const { video, mine } = selected;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 열림 = 마운트 1회 — 닫기 버튼 포커스 (AC 6). 교체는 같은 마운트의 리렌더라 다시 옮기지 않는다
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // 열림·교체 시 자동재생 시도 (추정 4) — 카드 클릭 제스처 직후라 대체로 허용되고,
  // autoplay 정책·소스 로드 실패 시엔 무시하고 controls 수동 재생으로 폴백 (VideoPreview 관례)
  useEffect(() => {
    videoRef.current?.play()?.catch(() => {});
  }, [video.videoId]);

  return (
    <aside
      aria-label="영상 미니 패널"
      className="pointer-events-auto absolute inset-y-0 left-97 z-10 flex w-97 flex-col gap-sm border-l border-border bg-background p-md shadow-raised"
    >
      <div className="flex justify-end">
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="미니 패널 닫기"
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-sm text-foreground-muted hover:bg-surface"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>

      {/* 재생 영역 — 실 스트리밍 전 목 소스(CC0 샘플). 오프라인이면 재생만 실패, 패널 동작은 유지 (리스크 수용) */}
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-foreground">
        {video.videoSrc ? (
          <video
            ref={videoRef}
            src={video.videoSrc}
            controls
            playsInline
            className="size-full object-contain"
          />
        ) : (
          <Film aria-hidden className="size-8 text-foreground-inverse/40" />
        )}
      </div>

      <div className="flex flex-col gap-xxs">
        <h2 className="text-fm-title text-foreground">{video.title}</h2>
        <div className="flex items-center justify-between gap-sm">
          <VideoOwnerMeta video={video} mine={mine} />
          <span className="shrink-0 text-fm-caption text-foreground-muted">
            조회 {formatViewCountKo(video.viewCount)}
          </span>
        </div>
      </div>
    </aside>
  );
};
