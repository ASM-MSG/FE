import { useEffect, useRef } from "react";
import { Film, X } from "lucide-react";
import { Button } from "@fillmap/ui-web";
import { useVideoPlaybackQuery } from "@/features/map-home/model/use-video-playback-query";
import { playbackUnavailableMessage } from "@/features/map-home/model/video-playback";
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
 * 영상 미니 디테일 패널 (MSG-277 3차 AC 5·6·8~11 → MSG-326 실 재생 배선 — 기준 9·12).
 * 좌측 패널(w-97) 오른쪽에 flush로 붙는 전고 보조 패널 — 배경 지도 조작은 차단하지 않는다
 * (백드롭 없음). 재생 소스는 videoSrc(목 — 테마 피드 과도기, 추정 8) > getPlayback 응답
 * playbackUrl 순이고, 재생 조회는 로딩(placeholder)·실패(문구+재시도)·playbackUrl null
 * (처리 중·실패·블라인드 상태 문구 — MSG-329 병합 승계) 3분기를 가진다 (기준 12).
 * 제목은 서버에 영상 제목이 없어 목 title > zone 라벨("서면 I-6") > 행정동 > "영상" 폴백
 * (추정 4), 조회수는 재생 응답 값 우선 (추정 3).
 * 열릴 때(마운트) 포커스를 닫기 버튼으로 옮기고, 카드 교체(리렌더)에는 옮기지 않는다 (AC 6).
 * 접힘 시에는 셸의 display:none 래퍼로 좌측 패널과 함께 숨는다 (추정 9).
 */
export const VideoMiniPanel = ({ selected, onClose }: VideoMiniPanelProps) => {
  const { video, mine } = selected;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { playback, isPending, isError, retry } = useVideoPlaybackQuery(video);
  // 재생 소스 — 목(videoSrc) 우선, 실 API는 presigned playbackUrl (기준 9, 추정 8)
  const src = video.videoSrc ?? playback?.playbackUrl ?? null;
  // zoneName/zoneCell은 명세상 항상 쌍 — 구역 밖이면 함께 null (grid-label 관례)
  const zoneLabel =
    playback && playback.zoneName !== null
      ? `${playback.zoneName} ${playback.zoneCell}`
      : null;
  const title = video.title ?? zoneLabel ?? playback?.regionName ?? "영상";
  // 조회수 — 재생 응답 스냅샷 우선 (추정 3). 내 영상은 목록에 없어 응답 전까지 생략
  const viewCount = playback?.viewCount ?? video.viewCount;

  // 열림 = 마운트 1회 — 닫기 버튼 포커스 (AC 6). 교체는 같은 마운트의 리렌더라 다시 옮기지 않는다
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // 소스 도착·교체 시 자동재생 시도 (추정 4) — 카드 클릭 제스처 직후라 대체로 허용되고,
  // autoplay 정책·소스 로드 실패 시엔 무시하고 controls 수동 재생으로 폴백 (VideoPreview 관례)
  useEffect(() => {
    if (src !== null) videoRef.current?.play()?.catch(() => {});
  }, [src]);

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

      {/* 재생 영역 — 소스 확보 시 HTML5 video, 그 외 재생 조회 상태 3분기 (기준 9·12) */}
      <div
        aria-busy={isPending}
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-foreground"
      >
        {src !== null ? (
          <video
            ref={videoRef}
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
              onClick={retry}
            />
          </div>
        ) : isPending ? (
          <Film aria-hidden className="size-8 text-foreground-inverse/40" />
        ) : playback ? (
          // 조회는 성공했는데 playbackUrl null — non-READY(처리 중·실패)·BLINDED (기준 12)
          <p className="px-md text-center text-fm-caption text-foreground-inverse">
            {playbackUnavailableMessage(playback)}
          </p>
        ) : (
          <Film aria-hidden className="size-8 text-foreground-inverse/40" />
        )}
      </div>

      <div className="flex flex-col gap-xxs">
        <h2 className="text-fm-title text-foreground">{title}</h2>
        <div className="flex items-center justify-between gap-sm">
          <VideoOwnerMeta video={video} mine={mine} />
          {viewCount !== null && (
            <span className="shrink-0 text-fm-caption text-foreground-muted">
              조회 {formatViewCountKo(viewCount)}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
