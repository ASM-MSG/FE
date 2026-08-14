import { useMemo } from "react";
import { HOT_SAMPLE_GRID_LIMIT } from "./hot-region-summary";
import { missionGridIdsInBounds } from "./mission";
import {
  toCourseView,
  toMissionView,
  type CourseView,
  type MissionView,
} from "./mission-view";
import type { ThemeId } from "./theme";
import { useActiveMissionsQuery } from "./use-active-missions-query";
import { useCollectedGridsQuery } from "./use-collected-grids-query";
import { useGridNamesQuery } from "./use-grid-names-query";
import {
  useMultiGridVideosQuery,
  type MultiGridVideosResult,
} from "./use-multi-grid-videos-query";

/**
 * 홈 미션 목록·선택 파생 (MSG-395) — 활성 미션을 칩별 표시 모델로 바꾸고,
 * 선택된 미션의 상세 부재료(영상 피드·스팟 이름)까지 함께 붙인다.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 페이지에서 뽑아낸 이유(리뷰 반영 — 컴포넌트 300줄 초과): 목록 파생·선택 해석·상세
 * 부재료가 페이지 본문 100줄을 차지해 조립 코드가 파묻혔다.
 */
interface HomeMissionsInput {
  activeTheme: ThemeId | null;
  /** 선택된 미션 id — 목록에 실재하지 않으면 selectedMission이 null이 된다 */
  selectedMissionId: number | null;
}

export interface HomeMissions {
  /** 축제·팝업 칩 (경로추천·핫구역이면 null) */
  eventChip: Extract<ThemeId, "festival" | "popup"> | null;
  isRouteChip: boolean;
  missionViews: MissionView[];
  courseViews: CourseView[];
  selectedMission: MissionView | null;
  selectedCourse: CourseView | null;
  /** 선택 미션의 영상 피드 (표본 격자 합본) */
  missionFeed: MultiGridVideosResult;
  /** 선택 코스의 포토스팟 격자 표시명 */
  spotNames: ReadonlyMap<string, string>;
  /** 내 수집 격자 — 격자 상세의 점령 시작일 출처 */
  collectedGrids: ReturnType<typeof useCollectedGridsQuery>["grids"];
  isPending: boolean;
  /** 목록 실패 — **미션 조회만** 본다. 목록을 통째로 가리는 판정이라 좁게 유지한다 */
  isError: boolean;
  /**
   * 진행도 실패 (리뷰 반영) — 내 수집 격자 조회가 죽으면 분자가 통째로 비어 카드가
   * 전부 `0/N`이 된다. 조용히 두면 "아직 안 채웠다"로 읽히므로 알리되, `isError`에
   * 합치지는 않는다 — 합치면 멀쩡한 목록이 사라지고 "목록을 불러오지 못했어요"라는
   * 틀린 메시지가 뜬다
   */
  progressFailed: boolean;
  retry: () => void;
}

export const useHomeMissions = ({
  activeTheme,
  selectedMissionId,
}: HomeMissionsInput): HomeMissions => {
  const collected = useCollectedGridsQuery();
  const missions = useActiveMissionsQuery();

  // now는 상태 배지(D-N·오늘까지) 판정에 쓰이고 마운트 시점에 고정한다 — 매 렌더 새 Date면
  // 파생이 통째로 무효화되고, 하루가 지나 배지가 바뀌는 경우는 홈 재진입으로 갱신된다
  const now = useMemo(() => new Date(), []);

  // 칩을 두 갈래로 좁힌다 — 축제·팝업은 같은 카드/상세를 색만 달리 쓰고, 경로추천만
  // 라인·포토스팟이라는 다른 모양이다
  const eventChip =
    activeTheme === "festival" || activeTheme === "popup" ? activeTheme : null;
  const isRouteChip = activeTheme === "route";

  const missionViews = useMemo(() => {
    if (eventChip === null) return [];
    return missions.buckets[eventChip].map((dto) =>
      toMissionView(dto, collected.collected, now),
    );
  }, [eventChip, missions.buckets, collected.collected, now]);

  const courseViews = useMemo(() => {
    if (!isRouteChip) return [];
    return missions.buckets.route.map((dto) =>
      toCourseView(dto, collected.collected, now),
    );
  }, [isRouteChip, missions.buckets, collected.collected, now]);

  const selectedMission = useMemo(
    () => missionViews.find((v) => v.missionId === selectedMissionId) ?? null,
    [missionViews, selectedMissionId],
  );
  const selectedCourse = useMemo(
    () => courseViews.find((v) => v.missionId === selectedMissionId) ?? null,
    [courseViews, selectedMissionId],
  );

  // 미션 상세 피드 — 상세는 선택된 미션 하나뿐이라 그 미션의 경계 안에서만 격자를
  // 펼친다(뷰포트 무관 — 화면 밖 칸의 영상도 "이 미션의 영상"이다). 표본 격자 상한은
  // 동 요약과 같은 눈금이라 요청 수가 격자 수에 비례하지 않는다
  const missionFeedGridIds = useMemo(() => {
    const shape = selectedMission?.shape;
    if (!shape?.bbox) return [];
    return missionGridIdsInBounds(shape, shape.bbox).slice(
      0,
      HOT_SAMPLE_GRID_LIMIT,
    );
  }, [selectedMission]);
  const missionFeed = useMultiGridVideosQuery(missionFeedGridIds);

  // 코스 상세의 포토스팟 이름 — 미션 응답에 없어 격자별로 받아온다 (코스 상세를 열 때만)
  const spotGridIds = useMemo(
    () => selectedCourse?.spots.map((s) => s.gridId) ?? [],
    [selectedCourse],
  );
  const spotNames = useGridNamesQuery(spotGridIds);

  return {
    eventChip,
    isRouteChip,
    missionViews,
    courseViews,
    selectedMission,
    selectedCourse,
    missionFeed,
    spotNames,
    collectedGrids: collected.grids,
    isPending: missions.isPending,
    isError: missions.isError,
    progressFailed: collected.isError,
    retry: () => {
      missions.retry();
      collected.retry();
    },
  };
};
