import { LayoutGrid, X } from "lucide-react";
import type { LatLng } from "@/entities/cell";
import type { CollectedCell } from "@/entities/dex";
import { formatRelativeTime } from "@/shared/format";

interface RecentCellRowProps {
  cell: CollectedCell;
  /** 행 클릭 → 격자 중심으로 지도 이동 (AC 16, useMapShell().moveTo 주입) */
  onSelect: (center: LatLng) => void;
  /** X 클릭 → 표시 목록에서 제거 (AC 23·24, 개정 D4 — 수집 취소 아님, 통계·오버레이 불변) */
  onRemove: (cellId: string) => void;
}

/**
 * 최근 수집 격자 행 (AC 15·16·24·25) — Figma node 13399:1575 목록 행(개정 전 디자인).
 * 48px 아이콘 타일 + 격자 이름 + "N시간 전 · 영상 N개" 메타 + X 제거 버튼(개정 D4 — "›" 대체).
 * 이동 버튼과 X 버튼은 형제 요소다(중첩 버튼 금지) — X 클릭은 stopPropagation으로
 * 행 클릭(지도 이동) 전파를 차단하고, 행별 접근 가능한 이름을 가진다 (AC 25).
 * 수집 시점은 기존 상대시간 관례를 재사용한다 (추정 A7 — Figma "오늘·어제"는 플레이스홀더).
 */
export const RecentCellRow = ({
  cell,
  onSelect,
  onRemove,
}: RecentCellRowProps) => (
  <div className="flex w-full items-center rounded-md transition-colors hover:bg-surface-soft">
    <button
      type="button"
      onClick={() => onSelect(cell.center)}
      className="flex min-w-0 flex-1 items-center gap-sm p-xs text-left"
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
    </button>
    <button
      type="button"
      aria-label={`${cell.label} 목록에서 제거`}
      onClick={(event) => {
        // 형제 구조라 실전파는 없지만, 조상 클릭 리스너가 생겨도 지도 이동 오발동을 막는다 (AC 25)
        event.stopPropagation();
        onRemove(cell.cellId);
      }}
      className="mr-xs flex size-8 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
    >
      <X aria-hidden className="size-4" />
    </button>
  </div>
);
