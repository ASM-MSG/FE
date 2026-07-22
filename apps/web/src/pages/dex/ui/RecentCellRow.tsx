import { ChevronRight, LayoutGrid } from "lucide-react";
import type { LatLng } from "@/entities/cell";
import type { CollectedCell } from "@/entities/dex";
import { formatRelativeTime } from "@/shared/format";

interface RecentCellRowProps {
  cell: CollectedCell;
  /** 행 클릭 → 격자 중심으로 지도 이동 (AC 16, useMapShell().moveTo 주입) */
  onSelect: (center: LatLng) => void;
}

/**
 * 최근 수집 격자 행 (AC 15·16) — Figma node 13399:1575 목록 행.
 * 48px 아이콘 타일 + 격자 이름 + "N시간 전 · 영상 N개" 메타 + ChevronRight.
 * 수집 시점은 기존 상대시간 관례를 재사용한다 (추정 A7 — Figma "오늘·어제"는 플레이스홀더).
 */
export const RecentCellRow = ({ cell, onSelect }: RecentCellRowProps) => (
  <button
    type="button"
    onClick={() => onSelect(cell.center)}
    className="flex w-full items-center gap-sm rounded-md p-xs text-left transition-colors hover:bg-surface-soft"
  >
    <span
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
    >
      <LayoutGrid className="size-5" />
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-xxs">
      <span className="truncate text-fm-body-strong text-foreground">
        {cell.label}
      </span>
      <span className="truncate text-fm-caption text-foreground-muted">
        {formatRelativeTime(cell.collectedAt)} · 영상 {cell.videoCount}개
      </span>
    </span>
    <ChevronRight aria-hidden className="size-4 shrink-0 text-foreground-muted" />
  </button>
);
