import { useEffect, useRef } from "react";
import { DotsLoader, RetryNotice } from "@fillmap/ui-web";
import type { DisplayedRegion } from "@/features/region/model/region-panel-store";
import { useExploreRegionsQuery } from "@/features/region/model/use-explore-regions-query";

interface RegionListViewProps {
  /** 지역 선택 — 그 지역의 격자 리스트로 전환 (AC 10) */
  onSelect: (region: DisplayedRegion) => void;
}

/**
 * 전체 지역 리스트 (MSG-328 AC 10·11 → MSG-463 무한 스크롤) — "전체 보기"로 열리는
 * 패널 내 리스트. 20개 커서 페이지를 스크롤 끝 sentinel(IntersectionObserver)로 자동
 * 이어받는다 (확정 4 — 버튼 없는 자동). 하단 3상태: 이어받는 중(DotsLoader) /
 * 실패(RetryNotice — 받은 목록은 유지) / 더 없음(아무것도 없음).
 */
export const RegionListView = ({ onSelect }: RegionListViewProps) => {
  const {
    regions,
    isPending,
    isError,
    retry,
    hasNext,
    loadMore,
    isLoadingMore,
    loadMoreFailed,
  } = useExploreRegionsQuery();

  // sentinel은 이어받기 가능 상태에서만 렌더한다 — 실패 시 자동 재시도 루프를 막고
  // (재개는 RetryNotice의 수동 재시도만), 로딩 중 중복 트리거를 막는다
  const showSentinel = hasNext && !isLoadingMore && !loadMoreFailed;
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
    // showSentinel: sentinel li가 새로 붙을 때 관찰을 다시 건다 (ref는 렌더를 안 깨운다)
  }, [showSentinel, loadMore]);

  if (isError) {
    return (
      <RetryNotice message="지역 목록을 불러오지 못했어요" onRetry={retry} />
    );
  }

  if (isPending || regions === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <DotsLoader label="지역 목록 불러오는 중" />
      </div>
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
      {isLoadingMore && (
        <li className="flex justify-center py-sm">
          <DotsLoader label="다음 지역 불러오는 중" />
        </li>
      )}
      {loadMoreFailed && (
        <li>
          {/* 받은 목록은 그대로 두고 하단에서만 알린다 — 재시도가 이어받기를 재개한다 (AC 6) */}
          <RetryNotice
            message="다음 지역을 불러오지 못했어요"
            onRetry={loadMore}
          />
        </li>
      )}
      {showSentinel && <li ref={sentinelRef} aria-hidden className="h-px" />}
    </ul>
  );
};
