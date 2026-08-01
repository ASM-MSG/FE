import { Play } from "lucide-react";
import type { CellVideo } from "@/entities/cell";
import { formatDuration } from "@/features/explore/model/explore-cells";
import { formatViewCountKo } from "@/shared/format";
import { VideoOwnerMeta } from "./VideoOwnerMeta";

interface FeedVideoCardProps {
  video: CellVideo;
  /** 내 영상 여부 — 메타 문구 분기 (AC 4·5): 내 영상 "내 영상 · M월 D일" / 다른 사용자 "@핸들 · 상대시간" */
  mine: boolean;
  /** 카드 클릭 — 미니 디테일 패널 열기/교체 배선 (3차 AC 4, no-op div 대체) */
  onSelect: () => void;
}

/**
 * 세로 1열 피드 영상 카드 (MSG-277 AC 5 → 3차 AC 4 button화) — 테마 피드·점령 셀 상세 공용.
 * 썸네일 placeholder(회색 배경 + 중앙 primary 재생 아이콘 + 우하단 길이 배지 — 기존 카드 관례,
 * Figma 오탐 방지 1·5, 추정 8) 아래 메타 한 줄: 좌측 소유 구분 문구, 우측 "조회 {한국어 축약}".
 * 루트는 button — 카드에 제목 텍스트가 원래 없으므로 접근성 이름은 aria-label "{title} 재생"으로 부여.
 */
export const FeedVideoCard = ({ video, mine, onSelect }: FeedVideoCardProps) => {
  const duration = formatDuration(video.durationSec);
  return (
    <button
      type="button"
      aria-label={`${video.title} 재생`}
      onClick={onSelect}
      className="flex w-full flex-col gap-xxs text-left"
    >
      <span className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-sm bg-surface">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="size-3 fill-current" />
        </span>
        {duration && (
          <span className="absolute bottom-xs right-xs rounded-xs bg-navy-900/70 px-1.5 py-0.5 text-fm-caption text-foreground-inverse">
            {duration}
          </span>
        )}
      </span>
      <span className="flex w-full items-center justify-between gap-sm">
        <VideoOwnerMeta video={video} mine={mine} />
        <span className="shrink-0 text-fm-caption text-foreground-muted">
          조회 {formatViewCountKo(video.viewCount)}
        </span>
      </span>
    </button>
  );
};
