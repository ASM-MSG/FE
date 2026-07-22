import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import type { LatLng } from "@/entities/cell";
import type { CollectedCell } from "@/entities/dex";
import { deriveDexView } from "@/features/dex/model/dex-summary";
import {
  DEX_TAB_LABELS,
  dexTabPath,
  parseDexTab,
  type DexTab,
} from "@/features/dex/model/dex-tab";
import { useMapOverlayStore } from "@/features/dex/model/map-overlay-store";
import { useDexQuery } from "@/features/dex/model/use-dex-query";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";
import { DexProfileHeader } from "./ui/DexProfileHeader";
import { DexStatCards } from "./ui/DexStatCards";
import { DexTabs } from "./ui/DexTabs";
import { RecentCellRow } from "./ui/RecentCellRow";
import { RegionProgress } from "./ui/RegionProgress";

/**
 * 개인 도감 패널 (MSG-121, Figma node 13399:1575) — 지속 셸(MapShell) 지도 위 388px 좌측 오버레이.
 * 라우트 `/dex/:tab?`로 열리며 탭은 URL이 정본이다 (추정 A1): /dex→지도, /dex/gallery·/dex/badges→자리 탭.
 * 지도 탭은 프로필 요약·지역 탐험률·통계 카드·최근 수집 목록을 표시하고, 수집 격자
 * 오버레이를 map-overlay-store에 게시한다 — 렌더는 셸의 MapCanvas가 담당(AC 9·11).
 * 갤러리·뱃지 탭 내용은 MSG-122·123 범위라 자리 콘텐츠만 둔다 (AC 3).
 */
export const DexPanel = () => {
  const { tab: tabParam } = useParams();
  const tab = parseDexTab(tabParam);
  const navigate = useNavigate();
  const { moveTo } = useMapShell();
  const { data, isLoading, isError, refetch } = useDexQuery();

  const view = useMemo(() => (data ? deriveDexView(data) : null), [data]);

  const setCells = useMapOverlayStore((s) => s.setCells);
  const clear = useMapOverlayStore((s) => s.clear);

  // 지도 탭에서 수집 오버레이 게시, 탭 이탈·패널 언마운트(다른 섹션 이동) 시 해제 (AC 9·11)
  useEffect(() => {
    if (tab === "map" && view) setCells(view.overlayCells);
    return () => clear();
  }, [tab, view, setCells, clear]);

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
              totalLabel={view.totalLabel}
              totalExploredPct={view.totalExploredPct}
              streakDays={view.streakDays}
              onProfileClick={() => navigate(ROUTES.profile)}
            />
            <RegionProgress
              regionName={view.regionName}
              pct={view.regionExploredPct}
            />
            <DexStatCards
              collectedCellCount={view.collectedCellCount}
              badgeCount={view.badgeCount}
              streakDays={view.streakDays}
            />
            <DexTabs
              active={tab}
              onSelect={(next) => navigate(dexTabPath(next))}
            />
          </div>

          {tab === "map" ? (
            <RecentCellList cells={view.recentCells} onCellSelect={moveTo} />
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
  /** 최신순 정렬 완료 목록 — 상한 없이 전체, 패널 내 스크롤 (AC 14, 추정 A6) */
  cells: CollectedCell[];
  onCellSelect: (center: LatLng) => void;
}

/** "최근 수집한 격자" 섹션 — 목록 또는 빈 상태 안내 (AC 14~16·18) */
const RecentCellList = ({ cells, onCellSelect }: RecentCellListProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-sm px-md pb-md">
    <h2 className="text-fm-title text-foreground">최근 수집한 격자</h2>
    {cells.length === 0 ? (
      <p className="pt-lg text-center text-fm-body text-foreground-muted">
        아직 수집한 격자가 없어요. 첫 영상을 올려 격자를 수집해 보세요.
      </p>
    ) : (
      <ul className="flex flex-1 flex-col overflow-y-auto scrollbar-gutter-stable">
        {cells.map((cell) => (
          <li key={cell.cellId}>
            <RecentCellRow cell={cell} onSelect={onCellSelect} />
          </li>
        ))}
      </ul>
    )}
  </div>
);

/** 갤러리·뱃지 자리 콘텐츠 — 탭 골격까지가 이 티켓 범위 (AC 3, MSG-122·123에서 채움) */
const PlaceholderTabBody = ({ tab }: { tab: Exclude<DexTab, "map"> }) => (
  <div className="flex flex-1 items-center justify-center p-md">
    <p className="text-fm-body text-foreground-muted">
      {DEX_TAB_LABELS[tab]} 탭은 준비 중이에요
    </p>
  </div>
);
