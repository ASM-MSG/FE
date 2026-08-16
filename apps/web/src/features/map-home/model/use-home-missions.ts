import { useMemo } from "react";
import type { Bounds } from "@/entities/cell";
import { missionChipOfTheme } from "./mission";
import {
  toCourseView,
  toMissionView,
  type CourseView,
  type MissionView,
} from "./mission-view";
import type { ThemeId } from "./theme";
import { useActiveMissionsQuery } from "./use-active-missions-query";
import { useCollectedGridsQuery } from "./use-collected-grids-query";
import {
  useGridNamesQuery,
  type GridNamesResult,
} from "./use-grid-names-query";
import { useMissionDetailQuery } from "./use-mission-detail-query";
import { useMissionProgressQuery } from "./use-mission-progress-query";
import {
  useMissionVideosQuery,
  type MissionVideosResult,
} from "./use-mission-videos-query";

/**
 * 홈 미션 목록·선택 파생 (MSG-395 → MSG-403 서버 API 전환) — 활성 미션을 칩별 표시
 * 모델로 바꾸고, 선택된 미션의 상세 부재료(영상 피드·스팟 이름)까지 함께 붙인다.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * MSG-403의 전환 요지: 목록은 **칩별·확정 영역** 조회, 진행도는 목록 미션 id로 한 번에,
 * 스팟 방문 여부·상세 피드는 미션 상세·미션 영상 API가 준다 — 프론트 교집합 계산과
 * 격자별 다중 조회 조합이 사라졌다.
 */
interface HomeMissionsInput {
  activeTheme: ThemeId | null;
  /** 선택된 미션 id — 목록에 실재하지 않으면 selectedMission이 null이 된다 */
  selectedMissionId: number | null;
  /** 확정 영역 — 미션 목록 조회의 bbox (AC 12) */
  committedBounds: Bounds | null;
}

export interface HomeMissions {
  /** 축제·팝업 칩 (경로추천·핫구역이면 null) */
  eventChip: Extract<ThemeId, "festival" | "popup"> | null;
  isRouteChip: boolean;
  missionViews: MissionView[];
  courseViews: CourseView[];
  selectedMission: MissionView | null;
  selectedCourse: CourseView | null;
  /** 선택 미션의 영상 피드 */
  missionFeed: MissionVideosResult;
  /** 선택 코스의 포토스팟 격자 표시명 (+ 도착 대기) */
  spotNames: GridNamesResult;
  /** 내 수집 격자 — 격자 상세의 점령 시작일 출처 */
  collectedGrids: ReturnType<typeof useCollectedGridsQuery>["grids"];
  isPending: boolean;
  /** 목록 실패 — **미션 조회만** 본다. 목록을 통째로 가리는 판정이라 좁게 유지한다 */
  isError: boolean;
  /**
   * 진행도 실패 — 진행도 조회가 죽으면 분자가 통째로 비어 카드가 전부 `0/N`이 된다.
   * 조용히 두면 "아직 안 채웠다"로 읽히므로 알리되, `isError`에 합치지는 않는다 —
   * 합치면 멀쩡한 목록이 사라지고 "목록을 불러오지 못했어요"라는 틀린 메시지가 뜬다
   */
  progressFailed: boolean;
  retry: () => void;
}

export const useHomeMissions = ({
  activeTheme,
  selectedMissionId,
  committedBounds,
}: HomeMissionsInput): HomeMissions => {
  const chip = missionChipOfTheme(activeTheme);
  const collected = useCollectedGridsQuery();
  const missions = useActiveMissionsQuery(chip, committedBounds);

  // now는 상태 배지(D-N·오늘까지) 판정에 쓰이고 마운트 시점에 고정한다 — 매 렌더 새 Date면
  // 파생이 통째로 무효화되고, 하루가 지나 배지가 바뀌는 경우는 홈 재진입으로 갱신된다
  const now = useMemo(() => new Date(), []);

  // 칩을 두 갈래로 좁힌다 — 축제·팝업은 같은 카드/상세를 색만 달리 쓰고, 경로추천만
  // 라인·포토스팟이라는 다른 모양이다
  const eventChip = chip === "route" ? null : chip;
  const isRouteChip = chip === "route";

  // 목록 미션의 진행도를 한 번에 — 카드마다 조회하면 요청이 목록 길이에 비례한다
  const missionIds = useMemo(
    () => missions.missions.map((dto) => dto.missionId),
    [missions.missions],
  );
  const progress = useMissionProgressQuery(missionIds);

  // 선택된 미션의 상세 — 스팟 통계(방문 여부·영상 수)의 출처
  const detail = useMissionDetailQuery(selectedMissionId);
  const visitedGridIds = useMemo(() => {
    const visited = new Set<string>();
    for (const [gridId, stat] of detail.spotStats) {
      if (stat.visited) visited.add(gridId);
    }
    return visited;
  }, [detail.spotStats]);

  const missionViews = useMemo(() => {
    if (eventChip === null) return [];
    return missions.missions.map((dto) =>
      toMissionView(dto, progress.byMissionId.get(dto.missionId), now),
    );
  }, [eventChip, missions.missions, progress.byMissionId, now]);

  const courseViews = useMemo(() => {
    if (!isRouteChip) return [];
    return missions.missions.map((dto) =>
      toCourseView(
        dto,
        progress.byMissionId.get(dto.missionId),
        visitedGridIds,
        now,
      ),
    );
  }, [
    isRouteChip,
    missions.missions,
    progress.byMissionId,
    visitedGridIds,
    now,
  ]);

  const selectedMission = useMemo(
    () => missionViews.find((v) => v.missionId === selectedMissionId) ?? null,
    [missionViews, selectedMissionId],
  );
  const selectedCourse = useMemo(
    () => courseViews.find((v) => v.missionId === selectedMissionId) ?? null,
    [courseViews, selectedMissionId],
  );

  // 미션 상세 피드 — 미션 단위 API라 격자 표본을 뽑지 않는다 (MSG-403 AC 22)
  const missionFeed = useMissionVideosQuery(selectedMissionId);

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
    // 상세 실패도 진행도 실패로 본다 — 스팟 방문 표시의 출처가 같은 응답이다
    progressFailed: progress.isError || detail.isError,
    retry: () => {
      missions.retry();
      progress.retry();
      detail.retry();
    },
  };
};
