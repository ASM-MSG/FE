import { Play } from "lucide-react";
import { cellCenterAt, type LatLng } from "@/entities/cell";
import { gridCardLabel } from "@/features/region/model/grid-card";
import type { ExploreGridResponseDto } from "@/shared/api/generated/types.gen";
import { formatDuration } from "@/shared/format";

interface RegionGridCardProps {
  grid: ExploreGridResponseDto;
  /** 상위 응답의 행정동 이름 — zoneName null 격자의 라벨 폴백 (AC 6) */
  regionName: string;
  /** 카드 클릭 — 격자 중심 좌표로 지도 이동 (AC 7). 상세 열림은 지도 격자 탭 흐름에 위임 */
  onSelect: (center: LatLng) => void;
}

/**
 * 지역 격자 카드 (MSG-328 AC 5~7, Figma 14357-18972 thumb-card) — 풀폭 썸네일
 * (중앙 재생 아이콘 + 우하단 m:ss 배지) + 격자명 + "N개 영상".
 * coverThumbnailUrl이 null이면 회색 폴백 + 재생 아이콘만 남는다 (Figma 오탐 방지 —
 * 회색은 placeholder, 실구현은 presigned 썸네일).
 */
export const RegionGridCard = ({
  grid,
  regionName,
  onSelect,
}: RegionGridCardProps) => {
  const label = gridCardLabel(grid.zoneName, grid.zoneCell, regionName);
  const duration = formatDuration(grid.coverDurationSec);

  return (
    <button
      type="button"
      onClick={() =>
        onSelect(cellCenterAt({ gridX: grid.gridX, gridY: grid.gridY }))
      }
      className="flex w-full flex-col gap-xs text-left transition-opacity active:opacity-80"
    >
      <span className="relative flex aspect-[340/196] w-full items-center justify-center overflow-hidden rounded-md bg-surface">
        {grid.coverThumbnailUrl !== null && (
          <img
            src={grid.coverThumbnailUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <span className="relative flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Play className="size-3 fill-current" />
        </span>
        {duration && (
          <span className="absolute bottom-xs right-xs rounded-xs bg-navy-900/70 px-1.5 py-0.5 text-fm-caption text-foreground-inverse">
            {duration}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col gap-xxs">
        <span className="max-w-full truncate text-fm-body-strong text-foreground">
          {label}
        </span>
        <span className="text-fm-caption text-foreground-muted">
          {grid.videoCount}개 영상
        </span>
      </span>
    </button>
  );
};
