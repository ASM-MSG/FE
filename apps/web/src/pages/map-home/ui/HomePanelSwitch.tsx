import type { GridDetailResult } from "@/features/map-home/model/use-grid-detail-query";
import type { GridVideosResult } from "@/features/map-home/model/use-grid-videos-query";
import type { FeedVideo } from "@/features/map-home/model/grid-videos";
import type { HourlyChart } from "@/features/map-home/model/hourly-uploads";
import type { CourseSpot } from "@/features/map-home/model/course";
import type {
  CourseView,
  MissionView,
} from "@/features/map-home/model/mission-view";
import type { EventRoomSelection } from "@/features/event/model/event-room-store";
import type { HomePanelKind } from "@/features/map-home/model/panel-branch";
import type { HotRegionSummaryResult } from "@/features/map-home/model/use-hot-region-summary";
import type { GridNamesResult } from "@/features/map-home/model/use-grid-names-query";
import type { MissionVideosResult } from "@/features/map-home/model/use-mission-videos-query";
import type { ThemeId } from "@/features/map-home/model/theme";
import { CourseDetailPanel } from "./CourseDetailPanel";
import { CourseListPanel } from "./CourseListPanel";
import { EventRoomPanel } from "./EventRoomPanel";
import {
  HomeCellDetailError,
  HomeCellDetailLoading,
  HomeCellDetailPanel,
} from "./HomeCellDetailPanel";
import { HotRegionPanel } from "./HotRegionPanel";
import { MissionDetailPanel } from "./MissionDetailPanel";
import { MissionListPanel } from "./MissionListPanel";
import { RegionPanel } from "./RegionPanel";

interface HomePanelSwitchProps {
  /** 표시할 패널 — 순수 함수(panel-branch)가 정한 값 */
  panel: HomePanelKind;
  activeTheme: ThemeId | null;
  eventChip: Extract<ThemeId, "festival" | "popup"> | null;

  // 격자 상세
  gridDetail: GridDetailResult;
  gridVideos: GridVideosResult;
  gridChart: HourlyChart;
  gridContextLine: string | undefined;
  selectedSpot: CourseSpot | null;
  onCloseDetail: () => void;
  onBackFromDetail: () => void;
  onViewAll: () => void;

  // 행사방 (MSG-516 AC 10) — 캡슐 세그먼트 선택으로 열린다
  eventRoom: EventRoomSelection | null;
  onEventRoomBack: () => void;

  // 핫구역
  hotSummary: HotRegionSummaryResult;
  regionName: string | null;
  onHotUpload: () => void;

  // 미션·코스
  missionViews: MissionView[];
  courseViews: CourseView[];
  selectedMission: MissionView | null;
  selectedCourse: CourseView | null;
  missionFeed: MissionVideosResult;
  spotNames: GridNamesResult;
  listPending: boolean;
  listFailed: boolean;
  /** 진행도 부재료(내 수집 격자) 실패 — 목록은 유지하고 안내만 얹는다 */
  progressFailed: boolean;
  /**
   * 비로그인 진행도 잠금 (MSG-463 AC 9) — 페이지가 `!isAuthenticated`를 내린다.
   * 상세의 `내 진행`은 로그인 유도, 코스 카드의 진행 바·방문 수는 숨김 (확정 2·3)
   */
  progressLocked: boolean;
  onListRetry: () => void;
  onSelectMission: (missionId: number) => void;
  onHoverMission: (missionId: number | null) => void;
  onBackToList: () => void;
  onSelectSpot: (gridId: string) => void;

  // 공통
  onVideoSelect: (video: FeedVideo, mine: boolean) => void;
  onCloseTheme: () => void;
  onGridCardSelect: (gridId: string) => void;
}

/**
 * 홈 좌측 패널 분기 렌더 (MSG-395) — `panel-branch`가 고른 종류를 실제 패널로 바꾼다.
 *
 * 페이지에서 뽑아낸 이유(리뷰 반영 — 컴포넌트 300줄 초과): 7갈래 삼항 사슬이 페이지
 * 본문의 절반을 차지해, 데이터 조립부와 렌더 분기부가 한 화면에 안 들어왔다.
 * 분기 **판정**은 순수 함수가, **렌더**는 이 컴포넌트가, **데이터 조립**은 페이지가 맡는다.
 *
 * props가 많은 것은 이 컴포넌트가 상태를 갖지 않기 때문이다 — 스토어를 여기서 직접
 * 구독하면 페이지와 이중 구독이 되고, 어느 쪽이 정본인지 흐려진다.
 */
export const HomePanelSwitch = ({
  panel,
  activeTheme,
  eventChip,
  gridDetail,
  gridVideos,
  gridChart,
  gridContextLine,
  selectedSpot,
  onCloseDetail,
  onBackFromDetail,
  onViewAll,
  eventRoom,
  onEventRoomBack,
  hotSummary,
  regionName,
  onHotUpload,
  missionViews,
  courseViews,
  selectedMission,
  selectedCourse,
  missionFeed,
  spotNames,
  listPending,
  listFailed,
  progressFailed,
  progressLocked,
  onListRetry,
  onSelectMission,
  onHoverMission,
  onBackToList,
  onSelectSpot,
  onVideoSelect,
  onCloseTheme,
  onGridCardSelect,
}: HomePanelSwitchProps) => {
  if (panel === "grid-detail") {
    // 분기는 **선택 컨텍스트** 기준이다 — detail 기준으로 하면 격자를 바꿔 탭할 때
    // 새 응답 전까지 요약 패널로 튀었다 돌아온다 (MSG-325 리뷰 반영)
    if (gridDetail.detail)
      return (
        <HomeCellDetailPanel
          detail={gridDetail.detail}
          videos={gridVideos}
          onVideoSelect={onVideoSelect}
          onClose={onCloseDetail}
          onViewAll={onViewAll}
          onBack={activeTheme !== null ? onBackFromDetail : undefined}
          contextLine={gridContextLine}
          extraBadgeLabel={
            selectedSpot ? `코스 ${selectedSpot.order}번` : undefined
          }
          chart={gridChart.hasData ? gridChart : undefined}
        />
      );
    // 실패를 로딩으로 위장하지 않는다 — 재시도 수단을 준다 (MSG-325 리뷰 반영)
    if (gridDetail.isError)
      return (
        <HomeCellDetailError
          onRetry={gridDetail.retry}
          onClose={onCloseDetail}
        />
      );
    return <HomeCellDetailLoading onClose={onCloseDetail} />;
  }

  // 행사방 셸 (MSG-516 AC 10) — 라우트 없이 홈 패널 상태로 교체된다 (추정 5)
  if (panel === "event-room" && eventRoom)
    return <EventRoomPanel room={eventRoom} onBack={onEventRoomBack} />;

  if (panel === "hot-region")
    return (
      <HotRegionPanel
        summary={hotSummary}
        regionName={regionName}
        progressLocked={progressLocked}
        onVideoSelect={onVideoSelect}
        onViewAll={onViewAll}
        onClose={onCloseTheme}
        onUpload={onHotUpload}
      />
    );

  if (panel === "mission-detail" && selectedMission && eventChip)
    return (
      <MissionDetailPanel
        view={selectedMission}
        theme={eventChip}
        videos={missionFeed}
        progressFailed={progressFailed}
        progressLocked={progressLocked}
        onVideoSelect={onVideoSelect}
        onBack={onBackToList}
        onClose={onCloseTheme}
      />
    );

  if (panel === "course-detail" && selectedCourse)
    return (
      <CourseDetailPanel
        view={selectedCourse}
        spotNames={spotNames}
        progressFailed={progressFailed}
        progressLocked={progressLocked}
        onSpotSelect={onSelectSpot}
        onBack={onBackToList}
        onClose={onCloseTheme}
      />
    );

  if (panel === "mission-list" && eventChip)
    return (
      <MissionListPanel
        views={missionViews}
        theme={eventChip}
        isPending={listPending}
        isError={listFailed}
        progressFailed={progressFailed}
        onRetry={onListRetry}
        onSelect={onSelectMission}
        onHover={onHoverMission}
        onClose={onCloseTheme}
      />
    );

  if (panel === "course-list")
    return (
      <CourseListPanel
        views={courseViews}
        isPending={listPending}
        isError={listFailed}
        progressFailed={progressFailed}
        progressLocked={progressLocked}
        onRetry={onListRetry}
        onSelect={onSelectMission}
        onHover={onHoverMission}
        onClose={onCloseTheme}
      />
    );

  return <RegionPanel onGridSelect={onGridCardSelect} />;
};
