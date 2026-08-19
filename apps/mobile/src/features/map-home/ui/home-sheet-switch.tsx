import type { ExploreGridResponseDto } from "../../../shared/api/sdk";
import type { HomeGridDetail } from "../api/use-home-grid-detail";
import type { HomeMissions } from "../api/use-home-missions";
import type { HotRegionSummaryResult } from "../api/use-hot-region-summary";
import type { SheetState } from "../model/home-sheet-state";
import type { HomePanelKind } from "../model/panel-branch";
import { CourseDetailSheetContent } from "./course-detail-sheet-content";
import { CourseListSheetContent } from "./course-list-sheet-content";
import { DefaultSheetContent } from "./default-sheet-content";
import { GridDetailSheetContent } from "./grid-detail-sheet-content";
import type { HomeSheetContentContext } from "./home-sheet";
import { HotRegionSheetContent } from "./hot-region-sheet-content";
import { MissionDetailSheetContent } from "./mission-detail-sheet-content";
import { MissionListSheetContent } from "./mission-list-sheet-content";
import { SheetDetailFallback } from "./sheet-detail-fallback";

/**
 * 확장점 ② — 시트 콘텐츠 스위치 (MSG-427 A1).
 *
 * 분기는 `homePanelKind` **한 값**으로만 갈린다 — 칩 4종 × 상세 2단을 뷰의 삼항 사슬로
 * 두면 읽히지 않는다. **MSG-428(클러스터)은 이 파일에 분기를 추가하기만 하면 된다** —
 * 화면(`map-home-screen.tsx`)은 건드리지 않는 것이 인계 지점이다.
 * 조회는 전부 상위가 조립 훅으로 끝내고 여기로 값만 내려온다.
 */
interface HomeSheetSwitchProps {
  kind: HomePanelKind;
  sheet: HomeSheetContentContext;
  missions: HomeMissions;
  hotRegion: HotRegionSummaryResult;
  gridDetail: HomeGridDetail;
  /** 선택 격자 서버 id — 격자 상세의 코드 배지 (C5) */
  selectedGridId: string | null;
  /** 현재 행정동명 — 핫구역 요약 헤더·기본 시트 헤더 */
  regionName: string | null;
  /** 기본 시트(칩 미선택) 입력 — MSG-423 산출물 무수정 존치 */
  grids: ExploreGridResponseDto[];
  defaultSheetState: SheetState;
  /** action-row 표시 여부 — 핫구역 격자 상세에만 (C9) */
  showGridActions: boolean;
  onSelectMission: (missionId: number) => void;
  onSelectGrid: (gridId: string) => void;
  onBack: () => void;
  /** 테마 해제 — 목록 시트에서는 undefined라 ✕가 그려지지 않는다 (A4) */
  onClose?: () => void;
  onUpload: () => void;
  onRetryDefault: () => void;
}

export const HomeSheetSwitch = ({
  kind,
  sheet,
  missions,
  hotRegion,
  gridDetail,
  selectedGridId,
  regionName,
  grids,
  defaultSheetState,
  showGridActions,
  onSelectMission,
  onSelectGrid,
  onBack,
  onClose,
  onUpload,
  onRetryDefault,
}: HomeSheetSwitchProps) => {
  switch (kind) {
    case "grid-detail":
      return (
        <GridDetailSheetContent
          {...sheet}
          gridDetail={gridDetail}
          gridId={selectedGridId ?? ""}
          showActions={showGridActions}
          onBack={onBack}
          onClose={onClose}
          onUpload={onUpload}
        />
      );
    case "hot-region":
      return (
        <HotRegionSheetContent
          {...sheet}
          summary={hotRegion}
          regionName={regionName}
          onViewAll={onClose ?? onBack}
          onClose={onClose}
          onUpload={onUpload}
        />
      );
    case "mission-list":
      // eventChip은 kind가 mission-list인 동안 항상 채워져 있다 (panel-branch와 같은 입력)
      return missions.eventChip ? (
        <MissionListSheetContent
          {...sheet}
          theme={missions.eventChip}
          missions={missions}
          onSelect={onSelectMission}
        />
      ) : null;
    case "mission-detail":
      // 선택 미션이 뷰포트 밖으로 나가도 뷰는 래치로 유지된다 (P1). 그래도 뷰가 없는
      // 경우(탭 왕복 직후 목록 재조회 전)에는 **탈출 가능한 자리**를 그린다 —
      // null을 반환하면 헤더까지 사라져 시트에 갇힌다
      return missions.eventChip && missions.selectedMission ? (
        <MissionDetailSheetContent
          {...sheet}
          view={missions.selectedMission}
          theme={missions.eventChip}
          missions={missions}
          onBack={onBack}
          onClose={onClose}
        />
      ) : (
        <SheetDetailFallback
          missions={missions}
          onBack={onBack}
          onClose={onClose}
        />
      );
    case "course-list":
      return (
        <CourseListSheetContent
          {...sheet}
          missions={missions}
          onSelect={onSelectMission}
        />
      );
    case "course-detail":
      // mission-detail과 같은 규칙 — 뷰가 없어도 헤더는 남긴다 (P1)
      return missions.selectedCourse ? (
        <CourseDetailSheetContent
          {...sheet}
          view={missions.selectedCourse}
          missions={missions}
          onSpotSelect={onSelectGrid}
          onBack={onBack}
          onClose={onClose}
        />
      ) : (
        <SheetDetailFallback
          missions={missions}
          onBack={onBack}
          onClose={onClose}
        />
      );
    default:
      return (
        <DefaultSheetContent
          {...sheet}
          regionName={regionName}
          grids={grids}
          state={defaultSheetState}
          onRetry={onRetryDefault}
        />
      );
  }
};
