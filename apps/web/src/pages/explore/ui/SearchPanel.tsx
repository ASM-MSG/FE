import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { selectRegions } from "@/entities/region";
import { useExploreFilterStore } from "@/features/explore/model/explore-filter-store";
import { isHistoryEmpty } from "@/features/explore/model/recent-history";
import { RecentSearchRow } from "./RecentSearchRow";
import { RegionRow } from "./RegionRow";
import { SortChip } from "./SortChip";

interface SearchPanelProps {
  /** 패널 닫기(뒤로가기·바깥 클릭·필터 선택 후 복귀) (AC 10) */
  onClose: () => void;
}

/**
 * 검색 패널 오버레이 — SearchBar 클릭 시 탐색 패널 위에 뜨는 떠 있는 카드(Figma 13399-1795).
 * 뒤로가기 + 입력창 + 최근 방문 칩 + 최근 검색 리스트 + 전체 지역 목록으로 구성된다.
 * 타이핑 후 엔터/검색 아이콘으로 검색을 커밋하고 필터가 적용된 탐색 패널로 복귀한다(D2).
 * 바깥 영역 클릭으로 닫힌다(모달 시맨틱, AC 10).
 */
export const SearchPanel = ({ onClose }: SearchPanelProps) => {
  const recentVisits = useExploreFilterStore((s) => s.recentVisits);
  const recentSearches = useExploreFilterStore((s) => s.recentSearches);
  const applySearch = useExploreFilterStore((s) => s.applySearch);
  const selectRegion = useExploreFilterStore((s) => s.selectRegion);
  const removeRecentSearch = useExploreFilterStore((s) => s.removeRecentSearch);
  const clearRecentSearches = useExploreFilterStore(
    (s) => s.clearRecentSearches,
  );
  const regions = useMemo(() => selectRegions(), []);
  const [input, setInput] = useState("");

  const commitSearch = (term: string) => {
    if (!term.trim()) return;
    applySearch(term);
    onClose();
  };

  const chooseRegion = (name: string) => {
    selectRegion(name);
    onClose();
  };

  const visitsEmpty = isHistoryEmpty(recentVisits);
  const searchesEmpty = isHistoryEmpty(recentSearches);

  return (
    // 바깥 클릭 닫기용 백드롭 — 탐색 패널·지도 영역을 덮는다(AC 10)
    <div className="absolute inset-0 z-20" onClick={onClose}>
      <div
        role="dialog"
        aria-label="검색"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-md left-md top-md flex w-100 flex-col gap-md rounded-lg bg-background p-md shadow-raised"
      >
        {/* 검색 행: 뒤로가기 + 입력 필 */}
        <div className="flex shrink-0 items-center gap-sm">
          <button
            type="button"
            aria-label="뒤로가기"
            onClick={onClose}
            className="shrink-0 text-icon transition-opacity active:opacity-60"
          >
            <ChevronLeft className="size-6" />
          </button>
          <div className="flex flex-1 items-center gap-xs rounded-full bg-surface px-md py-sm">
            <input
              autoFocus
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitSearch(input);
              }}
              placeholder="장소, 격자, 영상 검색"
              className="min-w-0 flex-1 bg-transparent text-fm-base text-foreground outline-none placeholder:text-foreground-muted"
            />
            <button
              type="button"
              aria-label="검색"
              onClick={() => commitSearch(input)}
              className="shrink-0 text-icon transition-opacity active:opacity-60"
            >
              <Search className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-md overflow-y-auto scrollbar-gutter-stable">
          {/* 최근 방문 */}
          <section className="flex flex-col gap-sm">
            <h2 className="text-fm-label text-foreground-muted">최근 방문</h2>
            {visitsEmpty ? (
              <p className="text-fm-body text-foreground-muted">
                최근 방문한 지역이 없어요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-xs">
                {recentVisits.map((visit) => (
                  <SortChip
                    key={visit}
                    label={visit}
                    active={false}
                    onClick={() => chooseRegion(visit)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 최근 검색 */}
          <section className="flex flex-col gap-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-fm-label text-foreground-muted">최근 검색</h2>
              {!searchesEmpty && (
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-fm-label text-foreground-muted transition-opacity active:opacity-60"
                >
                  전체 삭제
                </button>
              )}
            </div>
            {searchesEmpty ? (
              <p className="text-fm-body text-foreground-muted">
                최근 검색 기록이 없어요.
              </p>
            ) : (
              <div className="flex flex-col">
                {recentSearches.map((term) => (
                  <RecentSearchRow
                    key={term}
                    term={term}
                    onSelect={commitSearch}
                    onRemove={removeRecentSearch}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 전체 지역 */}
          <section className="flex flex-col gap-xs border-t border-border pt-md">
            <h2 className="text-fm-label text-foreground-muted">전체 지역</h2>
            <div className="flex flex-col">
              {regions.map((region) => (
                <RegionRow
                  key={region.name}
                  name={region.name}
                  count={region.count}
                  onSelect={chooseRegion}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
