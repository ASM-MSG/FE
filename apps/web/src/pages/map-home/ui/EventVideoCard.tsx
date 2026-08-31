import { Play } from "lucide-react";
import { Thumbnail } from "@fillmap/ui-web";
import type { EventLocationVideoResponseDto } from "@/shared/api/generated/types.gen";
import { formatDuration, formatRelativeTime } from "@/shared/format";

interface EventVideoCardProps {
  video: EventLocationVideoResponseDto;
}

/**
 * 위치 현장 영상 카드 (MSG-518 AC 5·6) — Figma 15518:6364.
 * 썸네일(ui-web Thumbnail 폴백) + 중앙 재생 오버레이 + 길이 배지 +
 * "♥ N · 댓글 M" / 상대시간 메타 한 줄. DTO에 제목·소유자·조회수가 없어
 * FeedVideoCard를 재사용하지 않는다 (스펙 재사용 항목).
 *
 * MSG-520 확장점: 카드 클릭 재생(미니 패널)·좋아요·댓글 상호작용은 MSG-520이
 * 이 카드를 button화하며 얹는다 — 지금은 비인터랙티브 렌더다 (AC 6, 추정 2:
 * 동작 없는 button은 낭독만 남는 a11y 결함이라 비버튼으로 둔다).
 */
export const EventVideoCard = ({ video }: EventVideoCardProps) => {
  const duration = formatDuration(video.durationSec);

  return (
    <li className="flex flex-col gap-xxs">
      <span className="relative block aspect-video w-full overflow-hidden rounded-sm bg-surface">
        <Thumbnail src={video.thumbnailUrl} />
        {/* 중앙 재생 오버레이 (AC 5) — 장식, 재생 동작은 MSG-520 */}
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
      <span className="flex items-center justify-between gap-sm text-fm-caption text-foreground-muted">
        <span>{`♥ ${video.helpfulCount} · 댓글 ${video.commentCount}`}</span>
        <span>{formatRelativeTime(video.createdAt)}</span>
      </span>
    </li>
  );
};
