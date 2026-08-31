import { Play } from "lucide-react";
import { Thumbnail } from "@fillmap/ui-web";
import type { EventLocationVideoResponseDto } from "@/shared/api/generated/types.gen";
import { formatDuration, formatRelativeTime } from "@/shared/format";

interface EventVideoCardProps {
  video: EventLocationVideoResponseDto;
  /** 카드 클릭 — 행사 미니 패널 열기/교체 (MSG-520 AC 1·2) */
  onSelect: () => void;
}

/**
 * 위치 현장 영상 카드 (MSG-518 AC 5·6 → MSG-520 버튼화) — Figma 15518:6364.
 * 썸네일(ui-web Thumbnail 폴백) + 중앙 재생 오버레이 + 길이 배지 +
 * "♥ N · 댓글 M" / 상대시간 메타 한 줄. DTO에 제목·소유자·조회수가 없어
 * FeedVideoCard를 재사용하지 않는다 (스펙 재사용 항목).
 * MSG-520: 카드 전체가 button — 클릭 시 행사 미니 패널에서 재생한다 (AC 1·2,
 * MSG-518 확장점 해소). DTO에 제목이 없어 접근성 이름은 상대시간으로 구분한다.
 */
export const EventVideoCard = ({ video, onSelect }: EventVideoCardProps) => {
  const duration = formatDuration(video.durationSec);
  const relativeTime = formatRelativeTime(video.createdAt);

  return (
    <li>
      <button
        type="button"
        aria-label={`행사 영상 재생 — ${relativeTime}`}
        onClick={onSelect}
        className="flex w-full flex-col gap-xxs text-left"
      >
        <span className="relative block aspect-video w-full overflow-hidden rounded-sm bg-surface">
          <Thumbnail src={video.thumbnailUrl} />
          {/* 중앙 재생 오버레이 (AC 5) — 장식 */}
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-background/90 text-primary">
              <Play className="size-4 fill-current" />
            </span>
          </span>
          {duration && (
            <span className="absolute bottom-xs right-xs rounded-xs bg-navy-900/70 px-1.5 py-0.5 text-fm-caption text-foreground-inverse">
              {duration}
            </span>
          )}
        </span>
        <span className="flex w-full items-center justify-between gap-sm text-fm-caption text-foreground-muted">
          <span>{`♥ ${video.helpfulCount} · 댓글 ${video.commentCount}`}</span>
          <span>{relativeTime}</span>
        </span>
      </button>
    </li>
  );
};
