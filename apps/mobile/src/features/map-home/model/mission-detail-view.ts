import type {
  MissionDetailResponseDto,
  MissionProgressResponseDto,
} from "../../../shared/api/sdk";
import { formatMissionPeriod, formatOperationTime } from "./mission-format";
import type { ThemeId } from "./themes";

/**
 * 미션 상세 응답 → 표시 파생 (MSG-427 D12·E9·E10·E11·E12·E-16) — 순수 함수.
 * 지도 SDK/플랫폼에 의존하지 않는다.
 *
 * **웹의 미배선 2건을 여기서 고친다** (스펙 R6): 웹은 `올라온 영상`에 영상 첫 페이지
 * 길이(20에서 포화)를 쓰고 스팟 행 `영상 N`에 목 해시(`mission-video-count.ts`)를 쓰는데,
 * 서버는 두 값을 이미 준다(`videoCount`·`spotStats[].videoCount`). 모바일은 실값만 쓴다 —
 * 티켓의 "mock 의존 0건"(F1) 요구이기도 하다.
 */

/** 스팟 하나의 서버 통계 */
export interface MissionSpotStat {
  visited: boolean;
  videoCount: number;
}

export interface MissionDetailStats {
  /** 격자 id → 스팟 통계 — `방문함/미방문`·`영상 N`의 근거 (E10·E11) */
  spotStats: ReadonlyMap<string, MissionSpotStat>;
  /** 방문한 격자 id — 코스 표시 모델(`toCourseView`)의 입력 (E10) */
  visitedGridIds: ReadonlySet<string>;
  /** 미션 전체 영상 수 — 상세 스탯 `올라온 영상` (D12). 미도착이면 null */
  videoCount: number | null;
  /**
   * 이 미션의 내 진행도 — **선택 id로만 구동되는 상세 응답에서 온다**.
   * 목록 진행도(`/missions/progress`)는 목록 id 기반이라 선택 미션이 뷰포트를 벗어나면
   * 함께 비는데, 이 값은 그때도 살아 있다(P1). 미도착이면 null이라 소비처가 수치를
   * 주장하지 않는다. 명세상 목록 진행도와 같은 서버 계산이라 두 경로의 값이 갈리지 않는다.
   */
  progress: MissionProgressResponseDto | null;
  /** 스팟 영상 수의 합 — 코스 상세 헤더 `올라온 영상 N개` (E11) */
  spotVideoTotal: number;
}

const EMPTY_STATS: MissionDetailStats = {
  spotStats: new Map(),
  visitedGridIds: new Set(),
  videoCount: null,
  progress: null,
  spotVideoTotal: 0,
};

/** 상세 응답 → 표시 파생. 미도착이면 아무 수치도 주장하지 않는다. [D12·E10·E11] */
export const deriveMissionDetailStats = (
  dto: MissionDetailResponseDto | undefined,
): MissionDetailStats => {
  if (dto === undefined) return EMPTY_STATS;

  const spotStats = new Map<string, MissionSpotStat>();
  const visitedGridIds = new Set<string>();
  let spotVideoTotal = 0;

  for (const { gridId, visited, videoCount } of dto.spotStats) {
    spotStats.set(gridId, { visited, videoCount });
    if (visited) visitedGridIds.add(gridId);
    spotVideoTotal += videoCount;
  }

  return {
    spotStats,
    visitedGridIds,
    videoCount: dto.videoCount,
    progress: dto.progress,
    spotVideoTotal,
  };
};

/**
 * 상세 시트가 그릴 미션·코스 뷰 결정. [P1 회귀 방지]
 *
 * 목록(`/missions/active`)은 **뷰포트 bbox 기반**이라 상세를 열어 둔 채 지도를 조금만
 * 움직여도 선택 미션이 응답에서 빠진다. 목록에서만 찾으면 그 순간 뷰가 `null`이 되는데,
 * `selectedMissionId`는 그대로라 시트 분기는 계속 상세를 가리킨다 — 결과는 헤더(뒤로·닫기)가
 * 상세 콘텐츠 안에 있는 구조상 **탈출 수단이 없는 빈 시트**였다.
 *
 * 그래서 선택 id가 유지되는 동안에는 마지막으로 알던 뷰를 붙들어 둔다. 상세를 열어 놓고
 * 지도를 움직이는 것은 정상 조작이고, 목록 재조회 결과가 시트를 파괴해서는 안 된다.
 * **다른 미션을 고르면 즉시 버린다** — 남의 상세를 보여주는 것이 빈 시트보다 나쁘다.
 */
export const pickSelectedView = <T extends { missionId: number }>(
  views: readonly T[],
  selectedId: number | null,
  lastSelected: T | null,
): T | null => {
  if (selectedId === null) return null;
  const found = views.find((view) => view.missionId === selectedId);
  if (found !== undefined) return found;
  return lastSelected !== null && lastSelected.missionId === selectedId
    ? lastSelected
    : null;
};

/**
 * 포토스팟 행의 방문 라벨. [E9]
 * 진행도·상세 조회가 실패하면 `visited`가 전부 false로 폴백해 "미방문"이 사실처럼
 * 보이므로 **라벨 자체를 생략한다**(null). 순번 원 채움도 같은 값으로 게이트한다.
 */
export const spotVisitLabel = (
  visited: boolean,
  progressFailed: boolean,
): string | null => {
  if (progressFailed) return null;
  return visited ? "방문함" : "미방문";
};

/** 포토스팟 행의 이름 2줄 */
export interface CourseSpotLabel {
  name: string;
  description: string;
  /** 이름을 실제로 구했는가 — 뷰의 글자색 분기 */
  named: boolean;
}

/**
 * 코스 상세의 포토스팟 목록 표시 상태. [E12·E-16]
 *
 * 이름이 **하나라도 도착 전**이면 행 대신 로딩이다 — `courseSpotLabel`이 이름 부재를
 * `이름 없는 경유 지점`으로 적기 때문에, 아직 묻지도 않은 상태에 그 문구를 그리면
 * 로딩을 부재로 위장하는 거짓말이 된다. 웹 `CourseDetailPanel`이 같은 이유로 패널을
 * 막고, 모바일은 목록만 막는다(제목·진행도·거리는 이미 도착해 있다).
 *
 * 조회 **실패**는 로딩이 아니다 — 실패하면 `isPending`이 내려가고 이름 없는 스팟은
 * 격자 코드로 폴백한다(E-16). 그래서 실패 상태가 따로 없다.
 */
export type CourseSpotListState = "empty" | "loading" | "list";

export const courseSpotListState = (
  spotCount: number,
  namesPending: boolean,
): CourseSpotListState => {
  if (spotCount === 0) return "empty";
  return namesPending ? "loading" : "list";
};

/**
 * 포토스팟 이름 표기. [E12·E-16]
 * 이름은 격자 조회(`GET /api/grids/{gridId}`)에서 온다 (승인 Q2) — 못 구했으면
 * **격자 코드로 폴백**하고 둘째 줄에 `이름 없는 경유 지점`을 적는다. 목 문자열을 쓰지 않는다.
 */
export const courseSpotLabel = (
  gridId: string,
  order: number,
  name: string | undefined,
): CourseSpotLabel =>
  name === undefined
    ? { name: gridId, description: "이름 없는 경유 지점", named: false }
    : { name, description: `${order}번째 스팟`, named: true };

/** 미션 상세의 기간 표기 2종 — 부제와 스탯 칸이 서로 다른 값을 쓴다 */
export interface MissionDetailPeriod {
  /** 부제 `{장소} · {기간}`의 기간 조각 — **테마와 무관하게 날짜 기간**이다 */
  subtitle: string;
  /** 스탯 칸 라벨 — 팝업은 `운영시간`, 축제는 `축제 기간` */
  statLabel: string;
  /** 스탯 칸 값 */
  statValue: string;
}

/**
 * 미션 상세의 기간·운영시간 표기. [D11]
 *
 * **부제와 스탯을 하나의 값으로 묶으면 안 된다** (PR 검증이 잡은 결함): 팝업에서 둘 다
 * `formatOperationTime`을 쓰면 운영시간이 두 번 나오고 **날짜 기간이 화면에서 사라진다**.
 * 스펙 D11은 부제를 `{장소} · {기간}`으로 규정하고 Figma 화면 6도 `… · 7.31~8.14`다 —
 * 팝업의 정체성(운영시간)은 스탯 칸이 이미 담당한다.
 *
 * 폴백은 두 포맷터의 것을 그대로 쓴다: 기간이 없으면(무기간) `상시`, 종료일만 있으면
 * `11.7까지`, 팝업 운영시간이 비면 `운영시간 추후공지`.
 */
export const missionDetailPeriod = (
  theme: Extract<ThemeId, "festival" | "popup">,
  mission: {
    startAt: string | null;
    endAt: string | null;
    operationTime: string | null;
  },
): MissionDetailPeriod => {
  const period = formatMissionPeriod(mission.startAt, mission.endAt);

  return theme === "popup"
    ? {
        subtitle: period,
        statLabel: "운영시간",
        statValue: formatOperationTime(mission.operationTime),
      }
    : { subtitle: period, statLabel: "축제 기간", statValue: period };
};
