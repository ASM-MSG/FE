import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SearchBar } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import { selectRegions } from "@/entities/region";
import { useExploreFilterStore } from "@/features/explore/model/explore-filter-store";
import { isHistoryEmpty } from "@/features/explore/model/recent-history";
import { RecentSearchRow } from "./RecentSearchRow";
import { RegionRow } from "./RegionRow";

/**
 * 검색 박스 — 검색바 + 그 자리에 뜨는 드롭다운(최근 방문·최근 검색·전체 지역).
 * 탐색 패널로 이동하지 않고 어디서든(홈 등) 검색을 시작할 수 있다. 검색을 확정하면
 * (엔터·최근·지역 선택) 필터 정보를 실어 탐색 그리드로 이동해 결과를 보여준다.
 * 결과 조회는 탐색 패널이 담당하므로 이 컴포넌트는 입력과 제안만 다룬다.
 */
export const SearchBox = () => {
  const navigate = useNavigate();
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // 검색 확정 → 필터를 스토어에 적용하고 탐색 그리드로 이동(이미 탐색이면 그대로 갱신).
  // 스토어 구동이라 같은 경로 재이동(리마운트 없음)에도 결과가 바뀐다.
  const goSearch = (term: string) => {
    if (!term.trim()) return;
    applySearch(term.trim());
    setInput("");
    setOpen(false);
    navigate(ROUTES.explore);
  };
  const goRegion = (name: string) => {
    selectRegion(name);
    setInput("");
    setOpen(false);
    navigate(ROUTES.explore);
  };

  const visitsEmpty = isHistoryEmpty(recentVisits);
  const searchesEmpty = isHistoryEmpty(recentSearches);

  return (
    <div ref={rootRef} className="relative">
      <SearchBar
        placeholder="장소, 격자, 영상 검색"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") goSearch(input);
        }}
      />

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-xs flex max-h-[70vh] flex-col gap-md overflow-y-auto rounded-md border border-border bg-background p-md shadow-raised">
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
                  <button
                    key={visit}
                    type="button"
                    onClick={() => goRegion(visit)}
                    className="min-w-10 rounded-full border border-border bg-surface-soft px-3 py-1.5 text-fm-body-strong text-foreground-body"
                  >
                    {visit}
                  </button>
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
                    onSelect={goSearch}
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
                  onSelect={goRegion}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
