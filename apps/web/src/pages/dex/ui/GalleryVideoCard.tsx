import { Play } from "lucide-react";
import type { CollectedVideo } from "@/entities/dex";
import { formatDuration, formatRelativeTime } from "@/shared/format";

interface GalleryVideoCardProps {
  video: CollectedVideo;
  /** 그룹 내 표시 순번 — Figma "#4" 표기 (최신이 큰 번호) */
  seq: number;
  /** 최근 24시간 수집 여부 — NEW 배지 (기준 14, 판정은 isNewVideo) */
  isNew: boolean;
  /** 카드 클릭 — 우측 미니 패널 재생 배선은 부모(DexPanel) 몫 (기준 25) */
  onSelect: (video: CollectedVideo) => void;
}

/**
 * 갤러리 영상 카드 (MSG-327 기준 13·14, Figma node 14599:19418) — 1열 세로 리스트의 단위.
 * 풀폭 썸네일(중앙 재생 아이콘 + 우하단 m:ss 배지) + 하단 "#N · {상대시간} 수집" + NEW 배지.
 * 구 3열 GalleryThumbnail을 대체한다 — 1열이 영상 목록의 정본이다.
 * thumbnailUrl이 null이면(READY 이전·썸네일 없음) 회색 폴백 + 재생 아이콘만 남는다
 * (Figma 회색 타일은 placeholder — 실구현은 presigned 썸네일).
 */
export const GalleryVideoCard = ({
  video,
  seq,
  isNew,
  onSelect,
}: GalleryVideoCardProps) => {
  const duration = formatDuration(video.durationSec);

  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      className="flex w-full flex-col gap-xs text-left transition-opacity active:opacity-80"
    >
      <span className="relative flex aspect-[340/196] w-full items-center justify-center overflow-hidden rounded-md bg-surface">
        {video.thumbnailUrl !== null && (
          <img
            src={video.thumbnailUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <span className="relative flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="size-4 fill-current" />
        </span>
        {duration && (
          <span className="absolute bottom-xs right-xs rounded-xs bg-navy-900/70 px-1.5 py-0.5 text-fm-caption text-foreground-inverse">
            {duration}
          </span>
        )}
      </span>
      <span className="flex items-center gap-xs">
        <span className="shrink-0 text-fm-caption text-foreground-muted">
          #{seq}
        </span>
        <span className="min-w-0 flex-1 truncate text-fm-caption text-foreground-muted">
          {formatRelativeTime(video.createdAt)} 수집
        </span>
        {isNew && (
          <span className="shrink-0 rounded-xs bg-primary px-1.5 py-0.5 text-fm-caption text-primary-foreground">
            NEW
          </span>
        )}
      </span>
    </button>
  );
};
