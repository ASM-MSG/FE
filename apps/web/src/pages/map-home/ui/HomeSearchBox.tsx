import { useEffect, useRef, useState } from "react";
import { Button, SearchBar } from "@fillmap/ui-web";
import type { LatLng } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { usePlaceSearchQuery } from "@/features/search/model/use-place-search-query";
import { useTrendingQuery } from "@/features/search/model/use-trending-query";
import { RetryNotice } from "./RetryNotice";

interface HomeSearchBoxProps {
  /** 검색 결과 선택 — 해당 좌표로 지도 이동 (AC 16) */
  onPlaceSelect: (coords: LatLng) => void;
}

/**
 * 홈 검색 박스 (MSG-328 AC 13~17, Figma 14357-18972 SearchBar) — 검색바 + 그 자리 드롭다운.
 * 포커스 + 입력 없음이면 인기 검색어 TOP 10(AC 13), 입력 중이면 디바운스 300ms 장소 검색
 * 결과(장소명·주소, AC 15)를 보여준다. 인기 검색어 클릭은 그 키워드로 즉시 장소 검색을
 * 실행한다(AC 14 — trending은 좌표를 싣지 않는 백엔드 계약). 결과 선택 시 지도 이동 + 닫힘.
 * 구 SearchBox(탐색 이동형)를 대체한다 — 최근 방문·최근 검색 mock 기능은 신 디자인에 없어
 * 폐기(스펙 추정 6). 비로그인은 조회를 게이트하고 로그인 유도를 보여준다(익명 401 실측).
 */
export const HomeSearchBox = ({ onPlaceSelect }: HomeSearchBoxProps) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hasInput = input.trim().length > 0;
  const search = usePlaceSearchQuery(input, isAuthenticated && open);
  const trending = useTrendingQuery(isAuthenticated && open && !hasInput);

  // 바깥 클릭 시 드롭다운 닫기 (구 SearchBox 패턴 유지)
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

  // 즉시 검색 커밋 — Enter·검색 아이콘·인기 검색어 클릭 (추정 4·AC 14)
  const commitSearch = (term: string) => {
    const q = term.trim();
    if (!q) return;
    setInput(q);
    search.searchNow(q);
    setOpen(true);
  };

  const selectPlace = (coords: LatLng) => {
    onPlaceSelect(coords);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <SearchBar
        placeholder="장소, 격자 검색"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitSearch(input);
          else if (e.key === "Escape") setOpen(false);
        }}
        onSearch={() => commitSearch(input)}
      />

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-xs flex max-h-[70vh] flex-col gap-sm overflow-y-auto rounded-md border border-border bg-background p-md shadow-raised">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center gap-sm py-xs text-center">
              <p className="text-fm-body text-foreground-muted">
                로그인하면 장소와 격자를 검색할 수 있어요.
              </p>
              <Button
                text="로그인"
                variant="primary"
                size="sm"
                onClick={openLoginModal}
              />
            </div>
          ) : hasInput ? (
            <PlaceResultList
              places={search.places}
              isError={search.isError}
              onRetry={search.retry}
              onSelect={selectPlace}
            />
          ) : (
            <TrendingList
              keywords={trending.keywords}
              isError={trending.isError}
              onSelect={commitSearch}
            />
          )}
        </div>
      )}
    </div>
  );
};

interface PlaceResultListProps {
  places: ReturnType<typeof usePlaceSearchQuery>["places"];
  isError: boolean;
  onRetry: () => void;
  onSelect: (coords: LatLng) => void;
}

/** 장소 검색 결과 — 로딩·빈 결과·실패 상태 3종 처리 (AC 15~17) */
const PlaceResultList = ({
  places,
  isError,
  onRetry,
  onSelect,
}: PlaceResultListProps) => {
  if (isError) {
    return (
      <RetryNotice
        message="검색에 실패했어요. 잠시 후 다시 시도해 주세요."
        onRetry={onRetry}
      />
    );
  }

  if (places === undefined) {
    return <p className="py-xs text-fm-body text-foreground-muted">검색 중…</p>;
  }

  if (places.length === 0) {
    return (
      <p className="py-xs text-fm-body text-foreground-muted">
        검색 결과가 없어요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {places.map((place) => (
        <li key={`${place.gridId}-${place.name}`}>
          <button
            type="button"
            onClick={() => onSelect({ lat: place.lat, lng: place.lng })}
            className="flex w-full flex-col gap-xxs py-xs text-left transition-colors active:bg-surface-soft"
          >
            <span className="truncate text-fm-body-strong text-foreground">
              {place.name}
            </span>
            <span className="truncate text-fm-caption text-foreground-muted">
              {place.address}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};

interface TrendingListProps {
  keywords: ReturnType<typeof useTrendingQuery>["keywords"];
  isError: boolean;
  onSelect: (keyword: string) => void;
}

/** 인기 검색어 TOP 10 — 클릭 시 그 키워드로 장소 검색 실행 (AC 13·14) */
const TrendingList = ({ keywords, isError, onSelect }: TrendingListProps) => (
  <section className="flex flex-col gap-xs">
    <h2 className="text-fm-label text-foreground-muted">인기 검색어</h2>
    {isError ? (
      <p className="py-xs text-fm-body text-foreground-muted">
        인기 검색어를 불러오지 못했어요.
      </p>
    ) : keywords === undefined ? (
      <p className="py-xs text-fm-body text-foreground-muted">
        불러오는 중이에요…
      </p>
    ) : keywords.length === 0 ? (
      <p className="py-xs text-fm-body text-foreground-muted">
        아직 인기 검색어가 없어요.
      </p>
    ) : (
      <ul className="flex flex-col">
        {keywords.map((item) => (
          <li key={item.rank}>
            <button
              type="button"
              onClick={() => onSelect(item.keyword)}
              className="flex w-full items-center gap-sm py-xs text-left transition-colors active:bg-surface-soft"
            >
              <span className="w-5 shrink-0 text-fm-body-strong text-primary">
                {item.rank}
              </span>
              <span className="truncate text-fm-body text-foreground">
                {item.keyword}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
