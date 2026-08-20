import { describe, expect, it } from "vitest";
import type { MissionDetailResponseDto } from "../../../shared/api/sdk";
import {
  courseSpotLabel,
  courseSpotListState,
  deriveMissionDetailStats,
  missionDetailPeriod,
  pickSelectedView,
  spotVisitLabel,
} from "./mission-detail-view";

/**
 * D12·E9·E10·E11·E12·E-16: 미션 상세 응답에서 오는 값만 쓰고 목을 쓰지 않는다.
 * - `올라온 영상`은 서버 `videoCount` (영상 첫 페이지 길이가 아니다)
 * - 스팟 방문 여부·영상 수는 `spotStats[]` (FE 교집합·목 해시가 아니다)
 * - 진행도/상세 실패 시 방문 라벨을 생략하고, 이름을 못 구한 스팟은 격자 코드로 폴백한다
 */
const DETAIL: MissionDetailResponseDto = {
  mission: { missionId: 12 },
  progress: { missionId: 12, targetCount: 3, filledCount: 2, completed: false },
  videoCount: 47,
  spotStats: [
    { gridId: "16858_11420", visited: true, videoCount: 5 },
    { gridId: "16882_11434", visited: false, videoCount: 0 },
    { gridId: "16736_11276", visited: true, videoCount: 2 },
  ],
} as unknown as MissionDetailResponseDto;

describe("미션 상세 표시 파생 (D12·E10·E11)", () => {
  it("`올라온 영상`이 서버 videoCount를 쓴다 — 영상 첫 페이지 길이가 아니다", () => {
    expect(deriveMissionDetailStats(DETAIL).videoCount).toBe(47);
  });

  it("상세 미도착이면 videoCount가 null이라 뷰가 수치를 주장하지 않는다", () => {
    const stats = deriveMissionDetailStats(undefined);

    expect(stats.videoCount).toBeNull();
    expect(stats.spotStats.size).toBe(0);
    expect(stats.visitedGridIds.size).toBe(0);
    expect(stats.spotVideoTotal).toBe(0);
  });

  it("방문 여부의 출처가 spotStats[].visited다 (FE 교집합 계산이 아니다)", () => {
    const stats = deriveMissionDetailStats(DETAIL);

    expect([...stats.visitedGridIds].sort()).toEqual([
      "16736_11276",
      "16858_11420",
    ]);
    expect(stats.spotStats.get("16882_11434")).toEqual({
      visited: false,
      videoCount: 0,
    });
  });

  it("스팟 영상 수의 합이 코스 헤더의 `올라온 영상 N개`가 된다", () => {
    expect(deriveMissionDetailStats(DETAIL).spotVideoTotal).toBe(7);
  });
});

describe("포토스팟 행 표기 (E9·E12·E-16)", () => {
  it("진행도·상세 조회 실패 시 방문 라벨을 생략한다", () => {
    expect(spotVisitLabel(true, false)).toBe("방문함");
    expect(spotVisitLabel(false, false)).toBe("미방문");
    expect(spotVisitLabel(true, true)).toBeNull();
  });

  it("이름을 못 구한 스팟은 격자 코드 + `이름 없는 경유 지점`으로 표시한다", () => {
    expect(courseSpotLabel("16858_11420", 1, "자갈치 B-07")).toEqual({
      name: "자갈치 B-07",
      description: "1번째 스팟",
      named: true,
    });
    expect(courseSpotLabel("16858_11420", 3, undefined)).toEqual({
      name: "16858_11420",
      description: "이름 없는 경유 지점",
      named: false,
    });
  });

  /**
   * 회귀 방지 — `use-grid-names-query`의 `isPending`이 계산만 되고 아무도 소비하지 않아
   * 이름 도착 전 모든 스팟이 잠깐 `이름 없는 경유 지점`으로 표시되던 결함(리뷰 지적).
   * 판정을 여기로 끌어와 렌더 테스트 없이도 고정한다.
   */
  it("이름이 도착하기 전에는 행 대신 로딩이다 — `이름 없는 경유 지점`을 거짓말하지 않는다", () => {
    expect(courseSpotListState(3, true)).toBe("loading");
    expect(courseSpotListState(3, false)).toBe("list");
  });

  it("스팟이 없으면 이름 조회 상태와 무관하게 빈 결과다", () => {
    expect(courseSpotListState(0, true)).toBe("empty");
    expect(courseSpotListState(0, false)).toBe("empty");
  });
});

describe("미션 상세 기간·운영시간 표기 (D11)", () => {
  const FESTIVAL_DATES = {
    startAt: "2026-07-31T00:00:00",
    endAt: "2026-08-14T00:00:00",
  };

  it("부제는 테마와 무관하게 **날짜 기간**이다 — 팝업에서도 기간이 사라지지 않는다", () => {
    expect(
      missionDetailPeriod("popup", {
        ...FESTIVAL_DATES,
        operationTime: "매일 11:00~22:00",
      }).subtitle,
    ).toBe("7.31~8.14");
    expect(
      missionDetailPeriod("festival", {
        ...FESTIVAL_DATES,
        operationTime: null,
      }).subtitle,
    ).toBe("7.31~8.14");
  });

  it("스탯 칸은 팝업이면 `운영시간`, 축제면 `축제 기간`이다", () => {
    expect(
      missionDetailPeriod("popup", {
        ...FESTIVAL_DATES,
        operationTime: "매일 11:00~22:00",
      }),
    ).toEqual({
      subtitle: "7.31~8.14",
      statLabel: "운영시간",
      statValue: "매일 11:00~22:00",
    });
    expect(
      missionDetailPeriod("festival", {
        ...FESTIVAL_DATES,
        operationTime: "매일 11:00~22:00",
      }),
    ).toEqual({
      subtitle: "7.31~8.14",
      statLabel: "축제 기간",
      statValue: "7.31~8.14",
    });
  });

  it("팝업의 운영시간이 비면 스탯이 `운영시간 추후공지`로 떨어지고 부제는 기간을 유지한다", () => {
    for (const operationTime of [null, ""]) {
      expect(
        missionDetailPeriod("popup", { ...FESTIVAL_DATES, operationTime }),
      ).toEqual({
        subtitle: "7.31~8.14",
        statLabel: "운영시간",
        statValue: "운영시간 추후공지",
      });
    }
  });

  it("기간이 없으면(무기간) 부제·축제 스탯이 `상시`가 된다 — 팝업 스탯은 운영시간을 유지한다", () => {
    expect(
      missionDetailPeriod("festival", {
        startAt: null,
        endAt: null,
        operationTime: null,
      }),
    ).toEqual({
      subtitle: "상시",
      statLabel: "축제 기간",
      statValue: "상시",
    });
    expect(
      missionDetailPeriod("popup", {
        startAt: null,
        endAt: null,
        operationTime: "매일 11:00~22:00",
      }),
    ).toEqual({
      subtitle: "상시",
      statLabel: "운영시간",
      statValue: "매일 11:00~22:00",
    });
  });

  it("종료일만 있으면 부제가 `11.7까지`가 된다 (기간 폴백)", () => {
    expect(
      missionDetailPeriod("popup", {
        startAt: null,
        endAt: "2026-11-07T00:00:00",
        operationTime: null,
      }).subtitle,
    ).toBe("11.7까지");
  });
});

describe("선택 미션 뷰 결정 — 뷰포트 이동 내성 (P1 회귀)", () => {
  const A = { missionId: 11, title: "서면 여름축제" };
  const B = { missionId: 12, title: "전포 팝업" };

  it("목록에 있으면 목록의 최신 뷰를 쓴다", () => {
    expect(pickSelectedView([A, B], 11, null)).toBe(A);
  });

  it("지도를 움직여 선택 미션이 목록에서 빠져도 **직전 뷰를 유지한다** — 상세 시트가 사라지지 않는다", () => {
    // 카메라 이동 → /missions/active 응답에서 11번이 빠진 상황
    expect(pickSelectedView([B], 11, A)).toBe(A);
    expect(pickSelectedView([], 11, A)).toBe(A);
  });

  it("다른 미션을 고르면 직전 뷰를 버린다 — 남의 상세를 보여주지 않는다", () => {
    expect(pickSelectedView([], 12, A)).toBeNull();
  });

  it("선택이 해제되면(id null) 직전 뷰가 있어도 null이다", () => {
    expect(pickSelectedView([A], null, A)).toBeNull();
  });

  it("목록에도 없고 붙들어 둔 뷰도 없으면 null이다 — 호출부가 탈출 가능한 자리를 그린다", () => {
    expect(pickSelectedView([], 11, null)).toBeNull();
  });
});

describe("상세 진행도 (P1 — 목록 밖 미션의 진행도 출처)", () => {
  it("상세 응답의 progress를 그대로 내준다 — 목록 진행도가 비어도 낡은 값을 쓰지 않는다", () => {
    expect(deriveMissionDetailStats(DETAIL).progress).toEqual({
      missionId: 12,
      targetCount: 3,
      filledCount: 2,
      completed: false,
    });
  });

  it("상세 미도착이면 progress가 null이다 — 소비처가 수치를 주장하지 않는다", () => {
    expect(deriveMissionDetailStats(undefined).progress).toBeNull();
  });
});
