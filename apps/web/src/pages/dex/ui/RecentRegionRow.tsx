import { LayoutGrid, X } from "lucide-react";
import type { RecentRegion } from "@/entities/dex";
import { shortRegionName } from "@/features/dex/model/region-label";
import { formatRelativeTime } from "@/shared/format";

interface RecentRegionRowProps {
  region: RecentRegion;
  /** 행 클릭 — 그 동의 갤러리 진입 배선은 부모(DexPanel) 몫 (기준 10) */
  onSelect: (region: RecentRegion) => void;
  /** X 클릭 → 표시 목록에서 감춤 (기준 8 — 수집 취소 아님, 통계·지도 불변) */
  onRemove: (regionName: string) => void;
}

/**
 * 최근 수집 동 행 (MSG-327 기준 6·8, Figma node 14599:5081 목록 행) —
 * 48px 아이콘 타일 + 동 이름 + "{상대시간} · 영상 N개" 메타 + X 감춤 버튼.
 * MSG-121의 격자 행(RecentCellRow)을 동 단위로 대체한다 — 클릭이 지도 이동이 아니라
 * 그 동의 갤러리 진입이라는 점도 함께 바뀌었다.
 * 선택 버튼과 X 버튼은 형제 요소다(중첩 버튼 금지) — X는 stopPropagation으로 행 클릭
 * 전파를 막고 행별 접근 가능한 이름을 가진다.
 */
export const RecentRegionRow = ({
  region,
  onSelect,
  onRemove,
}: RecentRegionRowProps) => (
  <div className="flex w-full items-center rounded-md transition-colors hover:bg-surface-soft">
    <button
      type="button"
      onClick={() => onSelect(region)}
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
          {shortRegionName(region.regionName)}
        </span>
        <span className="truncate text-fm-caption text-foreground-muted">
          {formatRelativeTime(region.lastUploadedAt)} · 영상 {region.videoCount}
          개
        </span>
      </span>
    </button>
    <button
      type="button"
      aria-label={`${shortRegionName(region.regionName)} 목록에서 제거`}
      onClick={(event) => {
        // 형제 구조라 실전파는 없지만, 조상 클릭 리스너가 생겨도 갤러리 오진입을 막는다
        event.stopPropagation();
        onRemove(region.regionName);
      }}
      className="mr-xs flex size-8 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
    >
      <X aria-hidden className="size-4" />
    </button>
  </div>
);
