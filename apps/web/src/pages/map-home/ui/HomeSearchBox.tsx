import { useEffect, useRef, useState } from "react";
import { SearchBar } from "@fillmap/ui-web";
import type { Bounds, LatLng } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { useGridSearch } from "@/features/search/model/use-grid-search";
import { usePlaceSearchQuery } from "@/features/search/model/use-place-search-query";
import { useTrendingQuery } from "@/features/search/model/use-trending-query";
import type { GridSearchResult } from "@/features/search/model/zone-search";
import { RetryNotice } from "./RetryNotice";

interface HomeSearchBoxProps {
  /** 검색 결과 선택 — 해당 좌표로 지도 이동 (AC 16) */
  onPlaceSelect: (coords: LatLng) => void;
  /** 격자 결과 선택 — 그 격자로 이동 + 하이라이트 (MSG-412 AC 5·9) */
  onGridSelect: (gridId: string) => void;
  /** 구역 결과 선택 — 구역 사각형 전체가 보이게 fitBounds (MSG-412 AC 7) */
  onZoneSelect: (bounds: Bounds) => void;
}

/**
 * 홈 검색 박스 (MSG-328 AC 13~17, Figma 14357-18972 SearchBar) — 검색바 + 그 자리 드롭다운.
 * 포커스 + 입력 없음이면 인기 검색어 TOP 10(AC 13), 입력 중이면 디바운스 300ms 장소 검색
 * 결과(장소명·주소, AC 15)를 보여준다. 인기 검색어 클릭은 그 키워드로 즉시 장소 검색을
 * 실행한다(AC 14 — trending은 좌표를 싣지 않는 백엔드 계약). 결과 선택 시 지도 이동 + 닫힘.
 * 구 SearchBox(탐색 이동형)를 대체한다 — 최근 방문·최근 검색 mock 기능은 신 디자인에 없어
 * 폐기(스펙 추정 6).
 *
 * MSG-412: "서면 A-14" 형식 격자 검색 추가 — 서버 검색 API가 없어 zones(구역 사각형)를
 * 세션 1회 캐시하고 입력을 로컬 역파싱한다. 격자/구역 매치는 장소 결과 위에 별도 섹션으로
 * 표시하고(로컬 필터 — 디바운스 없이 즉시), 매치 없으면 섹션 자체가 없다 (AC 8).
 *
 * 비로그인(익명 401 실측)은 입력 진입 자체를 막는다 (MSG-328 사용자 피드백) — 클릭은
 * mousedown preventDefault로 포커스(보더)를 차단하고, 키보드(Tab) 포커스는 즉시 반환한다.
 * 두 경로 모두 도감(RequireAuth)과 동일하게 로그인 모달을 연다 — 무반응 아님(a11y).
 * 드롭다운·검색 쿼리는 로그인 상태에서만 동작한다.
 */
export const HomeSearchBox = ({
  onPlaceSelect,
  onGridSelect,
  onZoneSelect,
}: HomeSearchBoxProps) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hasInput = input.trim().length > 0;
  const search = usePlaceSearchQuery(input, isAuthenticated && open);
  const trending = useTrendingQuery(isAuthenticated && open && !hasInput);
  // zones는 훅 내부에서 로그인 상태의 마운트 시 1회만 조회된다 (MSG-412 AC 4)
  const gridResults = useGridSearch(input);

  // 인증이 풀리면(세션 만료 등) 즉시 게이트와 일치시킨다 (리뷰 P2) — mousedown/focus
  // 가드는 다음 이벤트에서만 동작하므로, 열린 드롭다운(캐시된 인기 검색어·검색 결과)과
  // input 포커스가 비로그인 상태에 남는 모순을 여기서 걷는다
  useEffect(() => {
    if (isAuthenticated) return;
    setOpen(false);
    const active = document.activeElement;
    if (
      rootRef.current &&
      active instanceof HTMLElement &&
      rootRef.current.contains(active)
    ) {
      active.blur();
    }
  }, [isAuthenticated]);

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

  // 격자/구역 결과 선택 — 지도 명령은 페이지 몫, 여기서는 위임 + 닫기만 (MSG-412 AC 5·7)
  const selectGridResult = (result: GridSearchResult) => {
    if (result.kind === "grid") onGridSelect(result.gridId);
    else onZoneSelect(result.bounds);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      // 비로그인 클릭 차단 — 검색바 전체(아이콘 포함)에서 포커스 진입을 막고 로그인 모달.
      // capture 단계 preventDefault라 input이 포커스(보더)를 얻지 않는다
      onMouseDownCapture={
        isAuthenticated
          ? undefined
          : (e) => {
              e.preventDefault();
              openLoginModal();
            }
      }
    >
      <SearchBar
        placeholder="장소, 격자 검색"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={(e) => {
          // 키보드(Tab) 진입 — 클릭과 동일하게 모달, 포커스는 즉시 반환 (무반응·트랩 금지)
          if (!isAuthenticated) {
            e.currentTarget.blur();
            openLoginModal();
            return;
          }
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitSearch(input);
          else if (e.key === "Escape") setOpen(false);
        }}
        onSearch={() => commitSearch(input)}
      />

      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-xs flex max-h-[70vh] flex-col gap-sm overflow-y-auto rounded-md border border-border bg-background p-md shadow-raised">
          {hasInput ? (
            <>
              {gridResults.length > 0 && (
                <GridResultList
                  results={gridResults}
                  onSelect={selectGridResult}
                />
              )}
              <PlaceResultList
                places={search.places}
                isError={search.isError}
                onRetry={search.retry}
                onSelect={selectPlace}
              />
            </>
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

interface GridResultListProps {
  results: GridSearchResult[];
  onSelect: (result: GridSearchResult) => void;
}

/**
 * 격자 검색 결과 섹션 (MSG-412 AC 8) — 장소 결과 위, 섹션 제목으로 구분.
 * 매치 없으면 부모가 렌더하지 않는다. 행 스타일은 기존 장소 결과 행 준용(스펙 리스크 —
 * 전용 Figma 디자인 없음). 라벨은 격자 응답 zoneName·zoneCell 조립과 동일 형식("서면 A-14").
 */
const GridResultList = ({ results, onSelect }: GridResultListProps) => (
  <section className="flex flex-col gap-xs">
    <h2 className="text-fm-label text-foreground-muted">격자</h2>
    <ul className="flex flex-col">
      {results.map((result) => (
        <li key={`${result.kind}-${result.zoneKey}`}>
          <button
            type="button"
            onClick={() => onSelect(result)}
            className="flex w-full flex-col gap-xxs py-xs text-left transition-colors active:bg-surface-soft"
          >
            <span className="truncate text-fm-body-strong text-foreground">
              {result.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  </section>
);

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
