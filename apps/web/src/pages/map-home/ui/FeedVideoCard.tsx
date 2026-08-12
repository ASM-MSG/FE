import { Play } from "lucide-react";
import type { FeedVideo } from "@/features/map-home/model/grid-videos";
import { formatDuration } from "@/features/explore/model/explore-cells";
import { formatViewCountKo } from "@/shared/format";
import { VideoOwnerMeta } from "./VideoOwnerMeta";

interface FeedVideoCardProps {
  /** MSG-326: CellVideo → FeedVideo 완화 — 격자 상세 실 API 항목·테마 피드 목 항목 공용 */
  video: FeedVideo;
  /** 내 영상 여부 — 메타 문구 분기 (AC 4·5): 내 영상 "내 영상 · M월 D일" / 다른 사용자 "@핸들 · 상대시간" */
  mine: boolean;
  /** 카드 클릭 — 미니 디테일 패널 열기/교체 배선 (3차 AC 4, no-op div 대체) */
  onSelect: () => void;
}

/**
 * 세로 1열 피드 영상 카드 (MSG-277 AC 5 → 3차 AC 4 button화 → MSG-326 실 썸네일) —
 * 테마 피드·격자 상세 공용.
 * MSG-326 기준 8·11: 응답 thumbnailUrl 이미지를 렌더한다 — 회색 placeholder는 null
 * (내 영상 non-READY) 폴백으로 강등되고, 이때 처리 상태 라벨을 함께 보여 깨진 이미지가
 * 없다(스펙 "의도적 차이 ①" — MSG-277 placeholder 관례 갱신). 카드 자체는 non-READY도
 * 탭 가능 — 재생 불가 안내는 미니 패널이 담당한다 (추정 6).
 * 메타 한 줄: 좌측 소유 구분 문구, 우측 "조회 {한국어 축약}"(viewCount 부재 시 생략 — 추정 3).
 * 루트는 button — 접근성 이름은 aria-label "{title} 재생"(실 API는 제목 부재라 "영상" 폴백).
 */
export const FeedVideoCard = ({
  video,
  mine,
  onSelect,
}: FeedVideoCardProps) => {
  const duration = formatDuration(video.durationSec);
  // 처리 상태 라벨 — thumbnailUrl null(non-READY 내 영상)일 때만 표시 (기준 11)
  const processingLabel =
    video.thumbnailUrl === null
      ? video.processingStatus === "FAILED"
        ? "처리 실패"
        : "처리 중"
      : null;

  return (
    <button
      type="button"
      aria-label={`${video.title ?? "영상"} 재생`}
      onClick={onSelect}
      className="flex w-full flex-col gap-xxs text-left"
    >
      <span className="relative flex aspect-video w-full flex-col items-center justify-center gap-xs overflow-hidden rounded-sm bg-surface">
        {video.thumbnailUrl !== null && (
          <img
            src={video.thumbnailUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <span className="relative flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="size-3 fill-current" />
        </span>
        {processingLabel && (
          <span className="relative text-fm-caption text-foreground-muted">
            {processingLabel}
          </span>
        )}
        {duration && (
          <span className="absolute bottom-xs right-xs rounded-xs bg-navy-900/70 px-1.5 py-0.5 text-fm-caption text-foreground-inverse">
            {duration}
          </span>
        )}
      </span>
      <span className="flex w-full items-center justify-between gap-sm">
        <VideoOwnerMeta video={video} mine={mine} />
        {video.viewCount !== null && (
          <span className="shrink-0 text-fm-caption text-foreground-muted">
            조회 {formatViewCountKo(video.viewCount)}
          </span>
        )}
      </span>
    </button>
  );
};
