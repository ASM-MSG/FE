import { useEffect, useRef } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { useVideoPlaybackQuery } from "@/features/map-home/model/use-video-playback-query";
import { playbackUnavailableMessage } from "@/features/map-home/model/video-playback";
import type { VideoMiniSelection } from "@/features/map-home/model/video-mini-panel-store";
import { VideoMoreMenu } from "@/features/video-actions/ui/VideoMoreMenu";
import { formatViewCountKo } from "@/shared/format";
import { VideoOwnerMeta } from "./VideoOwnerMeta";
import { VideoPlaybackSurface } from "./VideoPlaybackSurface";

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

  return (
    <aside
      aria-label="영상 미니 패널"
      className="pointer-events-auto absolute inset-y-0 left-97 z-10 flex w-97 flex-col gap-sm border-l border-border bg-background p-md shadow-raised"
    >
      <div className="flex justify-end gap-xxs">
        {/* 헤더 더보기 (MSG-411 AC 9, 승인 결정 1 — 시안 부재, 기존 아이콘 버튼 스타일 준용):
            내 영상=공개 범위·삭제 / 타인=신고. 목록에 없는 격자·구역 메타는 이 패널이
            이미 조회한 playback으로 보강. 삭제 성공 시 패널 닫기는 useDeleteVideo가
            스토어 연동으로 중앙 처리한다 (codex 리뷰 3) */}
        <VideoMoreMenu
          target={{
            videoId: video.videoId,
            gridId: playback?.gridId ?? null,
            thumbnailUrl: video.thumbnailUrl ?? playback?.thumbnailUrl ?? null,
            durationSec: video.durationSec,
            createdAt: video.recordedAt,
            zoneName: playback?.zoneName ?? null,
            zoneCell: playback?.zoneCell ?? null,
          }}
          mine={mine}
        >
          <button
            type="button"
            aria-label="영상 더보기"
            className="flex size-8 items-center justify-center rounded-sm text-foreground-muted hover:bg-surface"
          >
            <MoreHorizontal aria-hidden className="size-5" />
          </button>
        </VideoMoreMenu>
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

      {/* 재생 영역 — 공유 표면(MSG-520 추출)에 위임: 소스 확보 시 HTML5 video,
          그 외 재생 조회 상태 3분기 (기준 9·12) */}
      <VideoPlaybackSurface
        src={src}
        isPending={isPending}
        isError={isError}
        onRetry={retry}
        unavailableMessage={
          playback ? playbackUnavailableMessage(playback) : null
        }
      />

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
