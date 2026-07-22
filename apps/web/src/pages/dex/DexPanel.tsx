import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import type { LatLng } from "@/entities/cell";
import type { CollectedCell } from "@/entities/dex";
import { resolveCurrentRegion } from "@/features/dex/model/current-region";
import { deriveDexView, excludeRemoved } from "@/features/dex/model/dex-summary";
import {
  DEX_TAB_LABELS,
  dexTabPath,
  parseDexTab,
  type DexTab,
} from "@/features/dex/model/dex-tab";
import {
  districtOfCell,
  resolveGalleryRegion,
} from "@/features/dex/model/gallery";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useMapOverlayStore } from "@/features/dex/model/map-overlay-store";
import { useCurrentRegionName } from "@/features/dex/model/use-current-region";
import { useDexQuery } from "@/features/dex/model/use-dex-query";
import { useRecentRemovalStore } from "@/features/dex/model/recent-removal-store";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { DexProfileHeader } from "./ui/DexProfileHeader";
import { DexStatCards } from "./ui/DexStatCards";
import { DexTabs } from "./ui/DexTabs";
import { GalleryTabBody } from "./ui/GalleryTabBody";
import { RecentCellRow } from "./ui/RecentCellRow";
import { RegionProgress } from "./ui/RegionProgress";

/**
 * 개인 도감 패널 (MSG-121 + MSG-122 갤러리 탭, Figma node 13399:1575·1654는 개정 전 디자인) —
 * 지속 셸(MapShell) 지도 위 388px 좌측 오버레이.
 * 라우트 `/dex/:tab?`로 열리며 탭은 URL이 정본이다 (추정 A1): /dex→지도, /dex/gallery→갤러리,
 * /dex/badges→자리 탭(MSG-123). 지도 탭은 프로필 요약·현재 지역 탐험률·통계 카드·최근 수집 목록,
 * 갤러리 탭은 지역별 갤러리(GalleryTabBody — 셀 클릭 선택 > 현재 지역 > "중구", MSG-122 AC 3·12).
 * 수집 격자 오버레이는 지도·갤러리 탭에서 게시하고(MSG-122 A3) 셀 클릭 핸들러를 함께 등록한다 —
 * 클릭 시 그 격자 지역의 갤러리로 전환(AC 14·18), 렌더는 셸의 MapCanvas가 담당.
 */
export const DexPanel = () => {
  const { tab: tabParam } = useParams();
  const tab = parseDexTab(tabParam);
  const navigate = useNavigate();
  const { moveTo } = useMapShell();
  const { data, isLoading, isError, refetch } = useDexQuery();

  const view = useMemo(() => (data ? deriveDexView(data) : null), [data]);

  // 현재 지역 — 진입 시 1회 측위 + 역지오코딩(A10). 조회 전·실패는 디폴트 "중구"(A13)로
  // 해석되므로 항상 존재한다 — 로딩 게이트는 view(쿼리)만 본다 (AC 6·21·22)
  const regionLookup = useCurrentRegionName();
  const region = useMemo(
    () => resolveCurrentRegion(regionLookup, view?.regionExploredPctMap ?? {}),
    [regionLookup, view],
  );

  // X 제거 상태(비영속, A11) — 표시 목록만 줄인다. 통계·오버레이 파생은 미참조 (AC 23·24)
  const removedIds = useRecentRemovalStore((s) => s.removedIds);
  const removeRecent = useRecentRemovalStore((s) => s.removeRecent);
  const visibleRecent = useMemo(
    () => (view ? excludeRemoved(view.recentCells, removedIds) : []),
    [view, removedIds],
  );

  const setCells = useMapOverlayStore((s) => s.setCells);
  const setOnCellClick = useMapOverlayStore((s) => s.setOnCellClick);
  const clear = useMapOverlayStore((s) => s.clear);

  // 갤러리 지역 — 셀 클릭 선택(비영속 스토어, A1) > 역지오코딩 > 디폴트 "중구" (MSG-122 AC 3)
  const selectedRegion = useGalleryRegionStore((s) => s.selectedRegion);
  const selectRegion = useGalleryRegionStore((s) => s.select);
  const clearRegion = useGalleryRegionStore((s) => s.clear);
  const galleryRegion = resolveGalleryRegion(selectedRegion, regionLookup);

  // 오버레이 셀 클릭 → 그 격자 지역 선택 + 갤러리 탭 전환 (MSG-122 AC 14).
  // 수집 목록에 없는 id는 no-op(AC 4 방어). 탐색 탭식 CellDetailSheet는 띄우지 않는다(기확정).
  const collectedCells = data?.collectedCells;
  const handleOverlayCellClick = useCallback(
    (cellId: string) => {
      if (!collectedCells) return;
      const district = districtOfCell(collectedCells, cellId);
      if (!district) return;
      selectRegion(district);
      navigate(dexTabPath("gallery"));
    },
    [collectedCells, selectRegion, navigate],
  );

  // 지도·갤러리 탭에서 수집 오버레이 게시(MSG-122 A3 — 갤러리 탭 유지+클릭 가능) + 클릭 핸들러 등록,
  // 탭 이탈(뱃지)·패널 언마운트(다른 섹션 이동) 시 해제 (AC 9·11, MSG-122 AC 18)
  useEffect(() => {
    if ((tab === "map" || tab === "gallery") && view) {
      setCells(view.overlayCells);
      setOnCellClick(handleOverlayCellClick);
    }
    return () => clear();
  }, [tab, view, setCells, setOnCellClick, handleOverlayCellClick, clear]);

  return (
    <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col bg-background shadow-raised">
      <h1 className="sr-only">도감</h1>
      {isError ? (
        <DexErrorState onRetry={() => refetch()} />
      ) : isLoading || !view ? (
        <p className="p-md text-fm-body text-foreground-muted">
          도감을 불러오는 중이에요…
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-md p-md">
            <DexProfileHeader
              nickname={view.nickname}
              avatarSrc={view.avatarSrc}
              totalExploredPct={view.totalExploredPct}
              onProfileClick={() => navigate(ROUTES.profile)}
            />
            <RegionProgress regionName={region.name} pct={region.pct} />
            <DexStatCards
              collectedCellCount={view.collectedCellCount}
              badgeCount={view.badgeCount}
              streakDays={view.streakDays}
            />
            <DexTabs
              active={tab}
              onSelect={(next) => {
                // 탭 클릭은 "직접 진입" — 이전 셀 클릭 선택을 초기화해 현재 지역 기준으로 (AC 11, A1)
                if (next === "gallery") clearRegion();
                navigate(dexTabPath(next));
              }}
            />
          </div>

          {tab === "map" ? (
            <RecentCellList
              cells={visibleRecent}
              hasCollected={view.recentCells.length > 0}
              onCellSelect={moveTo}
              onRemove={removeRecent}
            />
          ) : tab === "gallery" ? (
            // key={region} — 지역 변경 시 리마운트로 확장 상태를 프리뷰로 복귀 (A5)
            <GalleryTabBody key={galleryRegion} region={galleryRegion} />
          ) : (
            <PlaceholderTabBody tab={tab} />
          )}
        </>
      )}
    </aside>
  );
};

/** 오류 상태 + 재시도 (AC 19) — MapFallback과 동일 패턴(제목+보조 문구+primary sm 버튼) */
const DexErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-md px-lg text-center">
    <div className="flex flex-col gap-xxs">
      <p className="text-fm-title text-foreground">도감을 불러오지 못했어요</p>
      <p className="text-fm-body text-foreground-muted">
        네트워크 상태를 확인하고 다시 시도해 주세요
      </p>
    </div>
    <Button text="다시 시도" variant="primary" size="sm" onClick={onRetry} />
  </div>
);

interface RecentCellListProps {
  /** 표시 목록 — 최신순·상한 30 파생 결과에서 X 제거 항목을 뺀 것 (AC 14·23) */
  cells: CollectedCell[];
  /** 원본 수집 존재 여부 — 빈 상태 안내는 "수집 0건"일 때만 (X로 전부 제거한 경우와 구분) */
  hasCollected: boolean;
  onCellSelect: (center: LatLng) => void;
  onRemove: (cellId: string) => void;
}

/** "최근 수집한 격자" 섹션 — 목록 또는 빈 상태 안내 (AC 14~16·18·24) */
const RecentCellList = ({
  cells,
  hasCollected,
  onCellSelect,
  onRemove,
}: RecentCellListProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-sm px-md pb-md">
    <h2 className="text-fm-title text-foreground">최근 수집한 격자</h2>
    {cells.length === 0 ? (
      hasCollected ? null : (
        <p className="pt-lg text-center text-fm-body text-foreground-muted">
          아직 수집한 격자가 없어요. 첫 영상을 올려 격자를 수집해 보세요.
        </p>
      )
    ) : (
      <ul className="flex flex-1 flex-col overflow-y-auto scrollbar-gutter-stable">
        {cells.map((cell) => (
          <li key={cell.cellId}>
            <RecentCellRow
              cell={cell}
              onSelect={onCellSelect}
              onRemove={onRemove}
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);

/** 뱃지 자리 콘텐츠 — MSG-123에서 채움 (갤러리는 MSG-122에서 GalleryTabBody로 교체됨) */
const PlaceholderTabBody = ({ tab }: { tab: Exclude<DexTab, "map"> }) => (
  <div className="flex flex-1 items-center justify-center p-md">
    <p className="text-fm-body text-foreground-muted">
      {DEX_TAB_LABELS[tab]} 탭은 준비 중이에요
    </p>
  </div>
);
