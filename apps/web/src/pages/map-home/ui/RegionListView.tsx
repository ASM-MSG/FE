import type { DisplayedRegion } from "@/features/region/model/region-panel-store";
import { useExploreRegionsQuery } from "@/features/region/model/use-explore-regions-query";
import { RetryNotice } from "./RetryNotice";

interface RegionListViewProps {
  /** 지역 선택 — 그 지역의 격자 리스트로 전환 (AC 10) */
  onSelect: (region: DisplayedRegion) => void;
}

/**
 * 전체 지역 리스트 (MSG-328 AC 10·11) — "전체 보기"로 열리는 패널 내 리스트.
 * 행정동명 + 격자 수, 로딩·빈 결과·요청 실패(재시도) 상태 3종을 처리한다.
 */
export const RegionListView = ({ onSelect }: RegionListViewProps) => {
  const { regions, isPending, isError, retry } = useExploreRegionsQuery();

  if (isError) {
    return (
      <RetryNotice message="지역 목록을 불러오지 못했어요" onRetry={retry} />
    );
  }

  if (isPending || regions === undefined) {
    return (
      <p className="py-sm text-fm-body text-foreground-muted">
        지역 목록을 불러오는 중이에요…
      </p>
    );
  }

  if (regions.length === 0) {
    return (
      <p className="py-sm text-fm-body text-foreground-muted">
        아직 표시할 지역이 없어요.
      </p>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-gutter-stable">
      {regions.map((region) => (
        <li key={region.regionCode}>
          <button
            type="button"
            onClick={() =>
              onSelect({
                regionCode: region.regionCode,
                regionName: region.regionName,
              })
            }
            className="flex w-full items-center justify-between gap-sm py-sm text-left transition-colors active:bg-surface-soft"
          >
            <span className="truncate text-fm-body-strong text-foreground">
              {region.regionName}
            </span>
            <span className="shrink-0 text-fm-caption text-foreground-muted">
              격자 {region.gridCount}개
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
