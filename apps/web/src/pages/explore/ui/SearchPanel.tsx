import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { selectRegions } from "@/entities/region";
import { useExploreFilterStore } from "@/features/explore/model/explore-filter-store";
import { isHistoryEmpty } from "@/features/explore/model/recent-history";
import { RecentSearchRow } from "./RecentSearchRow";
import { RegionRow } from "./RegionRow";
import { SortChip } from "./SortChip";

interface SearchPanelProps {
  /** 검색 모드 닫기(뒤로가기·필터 선택 후 복귀) */
  onClose: () => void;
}

/**
 * 검색 모드 인라인 콘텐츠 — 탐색 패널(aside) 안에서 검색바를 그 자리에 유지한 채
 * 아래 영역만 최근 방문·최근 검색·전체 지역으로 바꾼다(네이버/카카오 지도식 인라인 전개).
 * 별도 오버레이·백드롭 없이 aside의 flex column 안에 그대로 들어간다.
 * 검색 필은 탐색 패널 SearchBar와 같은 자리·형태(배경색만 surface로 구분)이며 좌측에
 * 뒤로가기(‹)를 둔다. 타이핑 후 엔터/검색 아이콘으로 커밋하면 필터가 적용된 목록으로 복귀한다(D2).
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
    <>
      {/* 검색 필 — 탐색 패널 SearchBar와 같은 자리(p-md)·형태, 배경색만 surface로 구분하고
          좌측에 뒤로가기 버튼을 추가한다(전환 시 위치·모양이 튀지 않도록). */}
      <div className="p-md">
        <div className="flex h-12 items-center gap-xs rounded-md border-[1.5px] border-transparent bg-surface pl-sm pr-sm shadow-raised transition-colors focus-within:border-primary">
          <button
            type="button"
            aria-label="뒤로가기"
            onClick={onClose}
            className="shrink-0 text-icon transition-opacity active:opacity-60"
          >
            <ChevronLeft className="size-6" />
          </button>
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitSearch(input);
            }}
            placeholder="장소, 격자, 영상 검색"
            className="min-w-0 flex-1 bg-transparent text-fm-title font-normal leading-none text-foreground outline-none placeholder:text-foreground-muted"
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

      <div className="flex flex-1 flex-col gap-md overflow-y-auto px-md pb-md scrollbar-gutter-stable">
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
    </>
  );
};
