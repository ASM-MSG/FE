import { useCallback, useEffect, useMemo } from "react";
import { canOpenDetail } from "@/features/map-home/model/home-cell-detail";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import type { ThemeId, ThemeCell } from "@/features/map-home/model/theme";
import {
  emphasizeCell,
  themeCellGridIds,
} from "@/features/map-home/model/theme-overlay";
import type { HomeOverlays } from "@/features/map-home/model/use-home-overlays";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";

/**
 * 홈 오버레이 게시 배선 (MSG-403 리뷰 반영 — 컴포넌트 300줄 초과 분할).
 * **뷰-레이어 훅** — 게시 스토어·사이드바 스토어에 바로 배선하므로 RN 재사용 대상이 아니다.
 *
 * 페이지에서 뽑아낸 이유: 게시 셀 파생(재생 강조) · 탭 판정 집합 · 게시/해제 effect가
 * 서로만 참조하는 닫힌 블록인데, 페이지 본문에 두면 조립 코드 사이에 60줄이 끼어 읽기
 * 어렵다. 판정 집합 ≡ 게시 집합 계약(theme-overlay 주석)도 이 한 파일 안에서 지켜진다.
 */
interface HomeOverlayPublishInput {
  activeTheme: ThemeId | null;
  overlays: HomeOverlays;
  /** 핫구역 칩의 강조 셀 — 탭 판정 집합의 소스 (AC 11) */
  hotCells: ThemeCell[];
  occupiedIds: string[];
  /** 카드 재생 중 격자 — 게시 셀에 테두리 강조로 얹는다 (MSG-328) */
  playingGridId: string | null;
  /** 격자 검색 선택 격자 — 재생 강조와 병존하는 테두리 강조 (MSG-412 AC 6) */
  searchGridId: string | null;
}

export const useHomeOverlayPublish = ({
  activeTheme,
  overlays,
  hotCells,
  occupiedIds,
  playingGridId,
  searchGridId,
}: HomeOverlayPublishInput): void => {
  const selectCell = useHomeCellDetailStore((s) => s.select);
  const expandSidebar = useSidebarStore((s) => s.setCollapsed);
  const setCells = useMapOverlayStore((s) => s.setCells);
  const setRoutes = useMapOverlayStore((s) => s.setRoutes);
  const setLabels = useMapOverlayStore((s) => s.setLabels);
  const setOnCellClick = useMapOverlayStore((s) => s.setOnCellClick);
  const clearOverlays = useMapOverlayStore((s) => s.clear);

  // emphasizeCell 2단 적용 (MSG-412 AC 6) — 재생 강조와 검색 하이라이트가 병존하고,
  // 같은 격자면 셀 하나에 강조만 켜진다. 탭 판정 집합(clickableGridIds)은 아래에서
  // overlays.cells 원본을 보므로 강조 전용 셀은 판정에 들어가지 않는다(기존 계약 유지)
  const publishedCells = useMemo(
    () =>
      emphasizeCell(
        emphasizeCell(overlays.cells, playingGridId, occupiedIds),
        searchGridId,
        occupiedIds,
      ),
    [overlays.cells, playingGridId, searchGridId, occupiedIds],
  );

  // 셀 탭 → 상세 오픈/무시 판정 (AC 11) — 판정은 순수 함수, 스토어는 상태만.
  // 판정 id는 게시 id와 같은 규칙(좌표 유래 서버 gridId)이어야 한다
  const clickableGridIds = useMemo(
    () =>
      activeTheme === "hot"
        ? themeCellGridIds(hotCells)
        : // 재생 강조 셀(emphasizeCell)은 미션 타일이 아니므로 판정 집합에서 제외한다 —
          // 게시 목록이 아니라 오버레이 원본을 본다
          overlays.cells.map((cell) => cell.id),
    [activeTheme, hotCells, overlays.cells],
  );
  const handleCellTap = useCallback(
    (cellId: string) => {
      if (!canOpenDetail(activeTheme, cellId, clickableGridIds, occupiedIds))
        return;
      selectCell(cellId);
      expandSidebar(false);
    },
    [activeTheme, clickableGridIds, occupiedIds, selectCell, expandSidebar],
  );

  // 섹션 오버레이 게시 — 홈 마운트 중 유지, 이탈 시 해제. 격자선·기본 점령 셀은 셸 상시 층
  // 소유(MSG-263 D9)라 여기서 게시하지 않는다
  useEffect(() => {
    setCells(publishedCells);
    setRoutes(overlays.routes);
    setLabels(overlays.labels);
    setOnCellClick(handleCellTap);
    return () => clearOverlays();
  }, [
    publishedCells,
    overlays.routes,
    overlays.labels,
    handleCellTap,
    setCells,
    setRoutes,
    setLabels,
    setOnCellClick,
    clearOverlays,
  ]);
};
