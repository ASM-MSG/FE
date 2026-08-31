import { useCallback, useEffect, useMemo } from "react";
import type { EventChip } from "@/features/map-home/model/grid-mission-resolve";
import { canOpenDetail } from "@/features/map-home/model/home-cell-detail";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useMissionSelectionStore } from "@/features/map-home/model/mission-selection-store";
import type { ThemeId, ThemeCell } from "@/features/map-home/model/theme";
import { useGridMissionRouting } from "@/features/map-home/model/use-grid-mission-routing";
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
  /** 활성 축제·팝업 칩 — 활성이면 격자 탭이 미션 라우팅을 경유한다 (MSG-462 AC 7) */
  eventChip: EventChip | null;
  /** 활성 미션 격자 → 소속 미션 id — FE 도형 폴백 판정 입력 (MSG-462 AC 6ⓑ) */
  gridMembership: ReadonlyMap<string, number>;
  /**
   * 게시 정지 (MSG-517) — 행사방이 열려 있는 동안 true. 행사 오버레이 게시 훅
   * (use-event-overlay-publish)이 단독 게시자가 되도록 이 훅은 스토어를 건드리지 않는다 —
   * 같은 필드를 두 effect가 쓰면 나중에 재실행된 쪽이 상대 게시를 지운다.
   */
  suspended?: boolean;
}

export const useHomeOverlayPublish = ({
  activeTheme,
  overlays,
  hotCells,
  occupiedIds,
  playingGridId,
  searchGridId,
  eventChip,
  gridMembership,
  suspended = false,
}: HomeOverlayPublishInput): void => {
  const selectCell = useHomeCellDetailStore((s) => s.select);
  const closeCellDetail = useHomeCellDetailStore((s) => s.close);
  const selectMission = useMissionSelectionStore((s) => s.select);
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
  // 미션 상세 열기 (MSG-462 AC 7) — 격자 상세가 열려 있으면 닫는다. panel-branch가
  // grid-detail을 우선하므로 닫지 않으면 선택한 미션 상세가 격자 상세에 가려진다
  const openMissionDetail = useCallback(
    (missionId: number) => {
      closeCellDetail();
      selectMission(missionId);
    },
    [closeCellDetail, selectMission],
  );
  // 축제·팝업 칩 활성 중 격자 탭 → API+도형 하이브리드 판정으로 미션/격자 상세 분기
  const routeGridTap = useGridMissionRouting({
    chip: eventChip,
    membership: gridMembership,
    selectMission: openMissionDetail,
    selectCell,
  });
  const handleCellTap = useCallback(
    (cellId: string) => {
      // 탭 판정 집합은 종전 그대로 — 게시(클릭 가능) 격자만 반응한다 (AC 11 계약 유지)
      if (!canOpenDetail(activeTheme, cellId, clickableGridIds, occupiedIds))
        return;
      if (eventChip !== null) {
        // 격자 상세 대신 그 행사의 미션 상세로 (MSG-462 AC 7) — 판정 실패는 격자 상세 폴백
        routeGridTap(cellId);
      } else {
        selectCell(cellId);
      }
      expandSidebar(false);
    },
    [
      activeTheme,
      clickableGridIds,
      occupiedIds,
      eventChip,
      routeGridTap,
      selectCell,
      expandSidebar,
    ],
  );

  // 섹션 오버레이 게시 — 홈 마운트 중 유지, 이탈 시 해제. 격자선·기본 점령 셀은 셸 상시 층
  // 소유(MSG-263 D9)라 여기서 게시하지 않는다
  useEffect(() => {
    // 행사방 열림 중에는 게시하지 않는다 (MSG-517) — 정리(clear)도 하지 않아 행사
    // 게시를 지우지 않는다. 닫히면 이 effect가 재실행돼 홈 게시가 복원된다
    if (suspended) return;
    setCells(publishedCells);
    setRoutes(overlays.routes);
    setLabels(overlays.labels);
    setOnCellClick(handleCellTap);
    return () => clearOverlays();
  }, [
    suspended,
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
