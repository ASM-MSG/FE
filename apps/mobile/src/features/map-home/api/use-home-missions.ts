import { useEffect, useMemo, useRef } from "react";
import type { Bounds } from "../../../entities/cell/model/grid";
import { deriveSheetState, type SheetState } from "../model/home-sheet-state";
import { missionChipOfTheme } from "../model/mission";
import { pickSelectedView } from "../model/mission-detail-view";
import {
  toCourseView,
  toMissionView,
  type CourseView,
  type MissionView,
} from "../model/mission-view";
import type { ThemeId } from "../model/themes";
import { useActiveMissionsQuery } from "./use-active-missions-query";
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
 * 홈 미션 목록·선택 조립 (MSG-427 D1·D2·D10~D13·E1~E14) — 웹
 * `features/map-home/model/use-home-missions.ts` 미러.
 * 지도 SDK·라우터를 import하지 않는다(RN 경계).
 *
 * 화면에 `useQuery` 직접 호출을 두지 않는다는 MSG-423 계약을 유지하기 위해, 칩 목록
 * 화면이 쓰는 조회 5종(목록·진행도·상세·영상·스팟 이름)을 여기서 묶는다.
 */
interface HomeMissionsInput {
  activeTheme: ThemeId | null;
  /**
   * 선택된 미션 id — 목록에서 빠져도(뷰포트 이동) 상세 뷰는 유지된다 (P1).
   * 이 id로 한 번도 뷰를 만든 적이 없으면(예: 탭 왕복 후 목록 재조회 전) 그때만 null이다.
   */
  selectedMissionId: number | null;
  /** 미션 목록 조회 bbox — 현재 뷰포트 (스펙 추정 4) */
  bounds: Bounds | null;
}

export interface HomeMissions {
  /** 축제·팝업 칩 (경로추천·핫구역이면 null) */
  eventChip: Extract<ThemeId, "festival" | "popup"> | null;
  isRouteChip: boolean;
  missionViews: MissionView[];
  courseViews: CourseView[];
  /**
   * 상세 시트가 그릴 미션 — 목록에서 빠져도 마지막으로 알던 뷰를 유지한다 (P1).
   * **null이면 호출부는 탈출 가능한 자리(헤더 + 상태)를 그려야 한다** — 빈 콘텐츠를
   * 렌더하면 헤더가 상세 콘텐츠 안에 있는 구조상 뒤로·닫기가 함께 사라진다.
   */
  selectedMission: MissionView | null;
  /** 상세 시트가 그릴 코스 — `selectedMission`과 같은 규칙 */
  selectedCourse: CourseView | null;
  /** 선택 미션의 영상 피드 */
  missionFeed: MissionVideosResult;
  /** 선택 미션 상세의 서버 영상 수 — `올라온 영상` 스탯 (D12) */
  detailVideoCount: number | null;
  /** 선택 코스 스팟의 영상 수 합 — 코스 상세 헤더 (E11) */
  spotVideoTotal: number;
  /** 격자 id → 스팟 통계 — 스팟 행 `영상 N` (E11) */
  spotStats: ReadonlyMap<string, { visited: boolean; videoCount: number }>;
  /** 선택 코스의 포토스팟 격자 표시명 (+ 도착 대기) */
  spotNames: GridNamesResult;
  /** 목록 시트 상태 — 로딩·빈 결과·실패가 구분된다 (A7·A8) */
  listState: SheetState;
  /** 목록 실패 — **미션 조회만** 본다. 목록을 통째로 가리는 판정이라 좁게 유지한다 */
  isError: boolean;
  /**
   * 진행도 실패 — 진행도가 죽으면 분자가 통째로 비어 카드가 전부 `0/N`이 된다.
   * 조용히 두면 "아직 안 채웠다"로 읽히므로 알리되, `isError`에 합치지는 않는다 (D13) —
   * 합치면 멀쩡한 목록이 사라지고 "목록을 불러오지 못했어요"라는 틀린 메시지가 뜬다.
   */
  progressFailed: boolean;
  retry: () => void;
}

export const useHomeMissions = ({
  activeTheme,
  selectedMissionId,
  bounds,
}: HomeMissionsInput): HomeMissions => {
  const chip = missionChipOfTheme(activeTheme);
  const missions = useActiveMissionsQuery(chip, bounds);

  // now는 상태 배지(D-N·오늘까지) 판정에 쓰이고 마운트 시점에 고정한다 (스펙 추정 3) —
  // 매 렌더 새 Date면 파생이 통째로 무효화되고, 날짜가 바뀐 경우는 홈 재진입으로 갱신된다
  const now = useMemo(() => new Date(), []);

  // 칩을 두 갈래로 좁힌다 — 축제·팝업은 같은 카드/상세를 색만 달리 쓰고, 경로추천만
  // 라인·포토스팟이라는 다른 모양이다
  const eventChip = chip === "route" ? null : chip;
  const isRouteChip = chip === "route";

  // 목록 미션의 진행도를 한 번에 (D2) — 카드마다 조회하면 요청이 목록 길이에 비례한다
  const missionIds = useMemo(
    () => missions.missions.map((dto) => dto.missionId),
    [missions.missions],
  );
  const progress = useMissionProgressQuery(missionIds);

  // 선택된 미션의 상세 — 영상 수·스팟 통계(방문 여부·영상 수)의 출처 (D12·E10·E11)
  const detail = useMissionDetailQuery(selectedMissionId);

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
        detail.stats.visitedGridIds,
        now,
      ),
    );
  }, [
    isRouteChip,
    missions.missions,
    progress.byMissionId,
    detail.stats.visitedGridIds,
    now,
  ]);

  /**
   * 선택 뷰 래치 (P1) — 목록은 뷰포트 bbox 기반이라 상세를 열어 둔 채 지도를 움직이면
   * 선택 미션이 응답에서 빠진다. 판정은 순수 함수(`pickSelectedView`)가 하고, 여기서는
   * 마지막으로 알던 뷰를 커밋 이후에 보관만 한다 — 렌더 중 ref를 쓰지 않으므로 값이
   * 한 커밋 뒤처질 수 있는데, "직전 뷰"가 정확히 우리가 원하는 의미다.
   */
  const latchedMission = useRef<MissionView | null>(null);
  const latchedCourse = useRef<CourseView | null>(null);

  const baseMission = pickSelectedView(
    missionViews,
    selectedMissionId,
    latchedMission.current,
  );
  const baseCourse = pickSelectedView(
    courseViews,
    selectedMissionId,
    latchedCourse.current,
  );

  useEffect(() => {
    latchedMission.current = baseMission;
  }, [baseMission]);
  useEffect(() => {
    latchedCourse.current = baseCourse;
  }, [baseCourse]);

  /**
   * 붙들어 둔 뷰의 진행도는 낡을 수 있다 — 목록 진행도가 목록 id 기반이기 때문이다.
   * 상세 조회는 **선택 id로만 구동돼 살아 있고** 명세상 같은 서버 계산의 진행도를 주므로,
   * 도착해 있으면 그 값으로 뷰를 다시 만든다(추가 요청 없음). 미도착·실패면 마지막으로
   * 알던 값을 그대로 두되, 그 경우는 `progressFailed`가 이미 "확인 불가"로 덮는다 (D13 취지).
   */
  const detailProgress = detail.stats.progress;
  const selectedMission = useMemo(
    () =>
      baseMission && detailProgress
        ? toMissionView(baseMission.dto, detailProgress, now)
        : baseMission,
    [baseMission, detailProgress, now],
  );
  const selectedCourse = useMemo(
    () =>
      baseCourse && detailProgress
        ? toCourseView(
            baseCourse.dto,
            detailProgress,
            detail.stats.visitedGridIds,
            now,
          )
        : baseCourse,
    [baseCourse, detailProgress, detail.stats.visitedGridIds, now],
  );

  // 미션 상세 피드 — 미션 단위 API라 격자 표본을 뽑지 않는다 (D10)
  const missionFeed = useMissionVideosQuery(selectedMissionId);

  // 코스 상세의 포토스팟 이름 — 미션 응답에 없어 격자별로 받아온다 (E12, 승인 Q2)
  const spotGridIds = useMemo(
    () => selectedCourse?.spots.map((s) => s.gridId) ?? [],
    [selectedCourse],
  );
  const spotNames = useGridNamesQuery(spotGridIds);

  const listCount = isRouteChip ? courseViews.length : missionViews.length;

  return {
    eventChip,
    isRouteChip,
    missionViews,
    courseViews,
    selectedMission,
    selectedCourse,
    missionFeed,
    detailVideoCount: detail.stats.videoCount,
    spotVideoTotal: detail.stats.spotVideoTotal,
    spotStats: detail.stats.spotStats,
    spotNames,
    // 목록 상태는 미션 조회만 본다 — 진행도 실패는 목록을 가리지 않는다 (D13)
    listState: deriveSheetState([missions], listCount),
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
