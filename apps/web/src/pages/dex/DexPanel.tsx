import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, cn } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import type { CollectedCell, CollectedVideo } from "@/entities/dex";
import { resolveCurrentRegion } from "@/features/dex/model/current-region";
import { deriveDexView, excludeRemoved } from "@/features/dex/model/dex-summary";
import {
  DEX_TAB_LABELS,
  dexTabPath,
  parseDexTab,
  type DexTab,
} from "@/features/dex/model/dex-tab";
import { districtOfCell } from "@/features/dex/model/gallery";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useMapOverlayStore } from "@/features/dex/model/map-overlay-store";
import { useCurrentRegionName } from "@/features/dex/model/use-current-region";
import { useDexQuery } from "@/features/dex/model/use-dex-query";
import { useRecentRemovalStore } from "@/features/dex/model/recent-removal-store";
import { useCellDetailStore } from "@/features/explore/model/cell-detail-store";
import { useCellsQuery } from "@/features/map-home/model/use-cells-query";
import { CellDetailSheet } from "@/widgets/cell-detail/CellDetailSheet";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { DexProfileHeader } from "./ui/DexProfileHeader";
import { DexStatCards } from "./ui/DexStatCards";
import { DexTabs } from "./ui/DexTabs";
import { GalleryTabBody } from "./ui/GalleryTabBody";
import { RecentCellRow } from "./ui/RecentCellRow";
import { RegionProgress } from "./ui/RegionProgress";

/**
 * 개인 도감 패널 (MSG-121 + MSG-122 ② 개정, Figma node 13399:1575·1654는 개정 전 디자인 —
 * 2탭·갤러리 뷰·썸네일 상세는 티켓 명시 사용자 결정으로 Figma 3탭 정본과 다르다) —
 * 지속 셸(MapShell) 지도 위 388px 좌측 오버레이.
 * 라우트 `/dex/:tab?`로 열리며 탭은 지도·뱃지 2개(URL 정본, AC 20): /dex→지도, /dex/badges→자리
 * 탭(MSG-123). 갤러리는 탭이 아니라 지도 탭 내부 뷰다(② B1) — gallery-region-store의
 * selectedRegion(null=최근 수집 목록, 문자열=그 지역 갤러리)으로 분기하고, 수집 셀·최근 수집 행
 * 클릭으로만 진입하며 지도 탭 클릭이 복귀다 (AC 14·19·22).
 * 썸네일 클릭은 탐색과 공유하는 격자 상세 시트(widgets/cell-detail, Q7)를 우측 flex-1 컬럼에
 * 연다 (AC 23, Q3) — 갤러리 진입·지역 전환·패널 언마운트에서 close해 상태 번짐을 차단한다 (AC 27).
 * 수집 격자 오버레이는 지도 탭에서 게시하고(② 단일화 — 갤러리 뷰는 지도 탭 내부라 AC 18 자동
 * 충족) 셀 클릭 핸들러를 함께 등록한다. 렌더는 셸의 MapCanvas가 담당.
 */
export const DexPanel = () => {
  const { tab: tabParam } = useParams();
  const tab = parseDexTab(tabParam);
  const navigate = useNavigate();
  const { moveTo } = useMapShell();
  const { data, isLoading, isError, refetch } = useDexQuery();
  // 격자 상세 시트용 격자 소스 — 탐색과 동일 소스·캐시(["cells"], Q7) (AC 23)
  const { data: cells } = useCellsQuery();

  const view = useMemo(() => (data ? deriveDexView(data) : null), [data]);

  // 현재 지역 — 진입 시 1회 측위 + 역지오코딩(A10). 조회 전·실패는 디폴트 "부산진구"(A13)로
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

  // 갤러리 뷰 상태 (② B1) — null=지도 탭 본문, 문자열=그 지역 갤러리 뷰. URL 미관여 (AC 5)
  const selectedRegion = useGalleryRegionStore((s) => s.selectedRegion);
  const selectRegion = useGalleryRegionStore((s) => s.select);
  const clearRegion = useGalleryRegionStore((s) => s.clear);

  // 격자 상세 시트 — 탐색과 스토어 공유 (Q7·R10)
  const selectedCellId = useCellDetailStore((s) => s.selectedCellId);
  const selectDetailCell = useCellDetailStore((s) => s.select);
  const selectDetailVideo = useCellDetailStore((s) => s.selectVideo);
  const closeDetail = useCellDetailStore((s) => s.close);

  // 갤러리 뷰 진입·지역 전환 공통 — 이전 시트(탐색 잔존 포함)를 닫아 상태 번짐 차단 (AC 27, B4)
  const enterGallery = useCallback(
    (district: string) => {
      closeDetail();
      selectRegion(district);
    },
    [closeDetail, selectRegion],
  );

  // 오버레이 셀 클릭 → 그 격자 지역의 갤러리 뷰 전환 (② AC 14 — URL 무변경, 탭 전환 아님).
  // 수집 목록에 없는 id는 no-op(AC 4 방어). 시트는 썸네일 클릭 전용 — 여기서 열지 않는다(B5).
  const collectedCells = data?.collectedCells;
  const handleOverlayCellClick = useCallback(
    (cellId: string) => {
      if (!collectedCells) return;
      const district = districtOfCell(collectedCells, cellId);
      if (!district) return;
      enterGallery(district);
    },
    [collectedCells, enterGallery],
  );

  // 최근 수집 행 클릭 — 기존 지도 이동(MSG-121 AC 16) 유지 + 행 지역 갤러리 뷰 전환 (② AC 19).
  // 행이 CollectedCell을 이미 가지므로 districtOfCell 조회 없이 district를 직접 쓴다 (스펙 구현 계획)
  const handleRecentCellClick = useCallback(
    (cell: CollectedCell) => {
      moveTo(cell.center);
      enterGallery(cell.district);
    },
    [moveTo, enterGallery],
  );

  // 썸네일 클릭 → 그 격자 상세 시트 + 클릭한 영상 활성 (AC 23). 격자 소스에 없는 cellId는
  // no-op(방어). 같은 격자 재클릭이면 select는 no-op이지만 selectVideo가 활성을 갱신한다
  // (cell-detail-store 기존 계약 — 스펙 구현 계획 3)
  const handleVideoClick = useCallback(
    (video: CollectedVideo) => {
      const cell = cells?.find((c) => c.id === video.cellId);
      if (!cell) return;
      selectDetailCell(cell);
      selectDetailVideo(video.id);
    },
    [cells, selectDetailCell, selectDetailVideo],
  );

  // 지도 탭에서 수집 오버레이 게시 + 클릭 핸들러 등록 (② map 단일화 — 갤러리 뷰는 지도 탭
  // 내부라 AC 18 자동 충족), 탭 이탈(뱃지)·패널 언마운트(다른 섹션 이동) 시 해제 (AC 9·11)
  useEffect(() => {
    if (tab === "map" && view) {
      setCells(view.overlayCells);
      setOnCellClick(handleOverlayCellClick);
    }
    return () => clear();
  }, [tab, view, setCells, setOnCellClick, handleOverlayCellClick, clear]);

  // 패널 언마운트(섹션 이탈) — 갤러리 뷰·시트 상태 해제 (B4, AC 27): 도감 재진입은 항상
  // 지도 본문에서 시작하고, 도감에서 연 시트가 탐색으로 새지 않는다 (zustand 액션 참조는 안정)
  useEffect(
    () => () => {
      clearRegion();
      closeDetail();
    },
    [clearRegion, closeDetail],
  );

  // 갤러리 뷰(지도 탭 + 지역 선택)에서만 시트를 켠다 — 탐색과 동일한 우측 flex-1 컬럼 (Q3)
  const galleryOpen = tab === "map" && selectedRegion !== null;
  const detailCell = galleryOpen
    ? (cells ?? []).find((c) => c.id === selectedCellId)
    : undefined;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-y-0 left-0 z-10 flex",
        detailCell && "right-0",
      )}
    >
      <aside className="flex w-97 shrink-0 flex-col bg-background shadow-raised">
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
                  // 지도 탭 클릭 = 갤러리 뷰 해제 → 지도 본문 복귀 (② AC 22 —
                  // 기존 "갤러리 탭 클릭 초기화"(AC 11 폐기)의 역할 승계)
                  if (next === "map") clearRegion();
                  navigate(dexTabPath(next));
                }}
              />
            </div>

            {tab === "map" ? (
              selectedRegion !== null ? (
                // key={region} — 지역 변경 시 리마운트로 확장 상태를 프리뷰로 복귀 (A5)
                <GalleryTabBody
                  key={selectedRegion}
                  region={selectedRegion}
                  onVideoClick={handleVideoClick}
                />
              ) : (
                <RecentCellList
                  cells={visibleRecent}
                  hasCollected={view.recentCells.length > 0}
                  onCellSelect={handleRecentCellClick}
                  onRemove={removeRecent}
                />
              )
            ) : (
              <PlaceholderTabBody tab={tab} />
            )}
          </>
        )}
      </aside>

      {detailCell && (
        <CellDetailSheet cell={detailCell} className="min-w-0 flex-1" />
      )}
    </div>
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
  /** 행 클릭 — 지도 이동 + 그 지역 갤러리 뷰 전환 배선 (AC 16, MSG-122 ② AC 19) */
  onCellSelect: (cell: CollectedCell) => void;
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

/** 뱃지 자리 콘텐츠 — MSG-123에서 채움 (② 개정: 갤러리 탭이 사라져 남은 자리 탭은 뱃지뿐) */
const PlaceholderTabBody = ({ tab }: { tab: Exclude<DexTab, "map"> }) => (
  <div className="flex flex-1 items-center justify-center p-md">
    <p className="text-fm-body text-foreground-muted">
      {DEX_TAB_LABELS[tab]} 탭은 준비 중이에요
    </p>
  </div>
);
