import { describe, expect, it } from "vitest";
import {
  GRASS_MODAL_WEEKS,
  GRASS_TAB_WEEKS,
  buildGrassWeeks,
  deriveGrassSummary,
  deriveMonthLabels,
  grassLevel,
  todayKstDate,
} from "./upload-grass";

/**
 * 업로드 잔디 파생 (MSG-414 AC 4·5·6) — 날짜는 전부 KST 라벨 문자열 산술이라
 * 실행 환경 타임존과 무관하게 결정적이다("오늘"은 todayKst 주입).
 * 2026-08-18은 화요일, 2026-08-16이 그 주의 일요일이다.
 */

const TODAY = "2026-08-18";

describe("buildGrassWeeks — 잔디 격자 파생 (AC 4)", () => {
  it("KST 오늘이 속한 주를 마지막 열로 24열×7행(주 시작=일요일) 격자를 만든다 (AC 4)", () => {
    const weeks = buildGrassWeeks([], TODAY, GRASS_TAB_WEEKS);

    expect(weeks).toHaveLength(24);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    // 마지막 열의 일요일 = 오늘(화)이 속한 주의 시작
    expect(weeks[23][0]?.date).toBe("2026-08-16");
    // 첫 열의 일요일 = 23주 전
    expect(weeks[0][0]?.date).toBe("2026-03-08");
  });

  it("uploadDate 일치 셀에 uploadCount가 들어가고, 이력에 없는 날은 0이다 (AC 4)", () => {
    const weeks = buildGrassWeeks(
      [
        { uploadDate: "2026-08-18", uploadCount: 3 },
        { uploadDate: "2026-03-08", uploadCount: 1 },
      ],
      TODAY,
      GRASS_TAB_WEEKS,
    );

    expect(weeks[23][2]).toEqual({ date: "2026-08-18", count: 3 });
    expect(weeks[0][0]).toEqual({ date: "2026-03-08", count: 1 });
    // 이력에 없는 날 — 0으로 채운다
    expect(weeks[23][1]).toEqual({ date: "2026-08-17", count: 0 });
  });

  it("마지막 주의 미래 날짜 셀은 null(자리 없음)이다 (AC 4)", () => {
    const weeks = buildGrassWeeks([], TODAY, GRASS_TAB_WEEKS);

    const lastWeek = weeks[23];
    // 일(16)·월(17)·화(18=오늘)까지만 자리가 있다
    expect(lastWeek[2]?.date).toBe("2026-08-18");
    expect(lastWeek.slice(3)).toEqual([null, null, null, null]);
  });

  it("빈 이력이면 전 셀이 0으로 채워진다 — 별도 빈 상태 없음 (AC 4·10, A7)", () => {
    const weeks = buildGrassWeeks([], TODAY, GRASS_TAB_WEEKS);

    const cells = weeks.flat().filter((cell) => cell !== null);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((cell) => cell.count === 0)).toBe(true);
  });

  it("연 경계를 걸치는 창도 연속된 날짜로 파생된다 (AC 4 경계)", () => {
    // 2026-01-06(화) 기준 4주 — 첫 열은 2025년 12월로 넘어간다
    const weeks = buildGrassWeeks(
      [{ uploadDate: "2025-12-31", uploadCount: 2 }],
      "2026-01-06",
      4,
    );

    expect(weeks[0][0]?.date).toBe("2025-12-14");
    expect(weeks[2][3]).toEqual({ date: "2025-12-31", count: 2 });
  });

  it("오늘이 일요일이면 마지막 열은 그 하루만 있다 (AC 4 주 경계)", () => {
    const weeks = buildGrassWeeks([], "2026-08-16", GRASS_TAB_WEEKS);

    expect(weeks[23][0]?.date).toBe("2026-08-16");
    expect(weeks[23].slice(1)).toEqual([null, null, null, null, null, null]);
  });
});

describe("grassLevel — 5단계 레벨 매핑 (AC 5, A3)", () => {
  it("고정 임계 0/1/2/3/4+로 매핑한다 (AC 5)", () => {
    expect(grassLevel(0)).toBe(0);
    expect(grassLevel(1)).toBe(1);
    expect(grassLevel(2)).toBe(2);
    expect(grassLevel(3)).toBe(3);
    expect(grassLevel(4)).toBe(4);
    expect(grassLevel(9)).toBe(4);
  });
});

describe("deriveMonthLabels — 월 라벨 파생 (AC 7 재료)", () => {
  it("각 열의 첫 날(일요일)이 새 달에 진입하는 열 위에 라벨을 단다 — 첫 열 포함 (GitHub 관례)", () => {
    const weeks = buildGrassWeeks([], TODAY, GRASS_TAB_WEEKS);

    expect(deriveMonthLabels(weeks)).toEqual([
      { weekIndex: 0, label: "3월" },
      { weekIndex: 4, label: "4월" },
      { weekIndex: 8, label: "5월" },
      { weekIndex: 13, label: "6월" },
      { weekIndex: 17, label: "7월" },
      { weekIndex: 21, label: "8월" },
    ]);
  });
});

describe("deriveGrassSummary — 요약 파생 (AC 6)", () => {
  it("빈 이력이면 0일 업로드·연속 0·최다 0·활발 요일 없음이다 (AC 6·10, A7)", () => {
    expect(deriveGrassSummary([], TODAY, GRASS_TAB_WEEKS)).toEqual({
      uploadDayCount: 0,
      longestStreak: 0,
      maxDailyCount: 0,
      mostActiveWeekday: null,
    });
  });

  it("창 내 업로드 일수·하루 최다 개수를 계산한다 (AC 6)", () => {
    const summary = deriveGrassSummary(
      [
        { uploadDate: "2026-08-18", uploadCount: 3 },
        { uploadDate: "2026-08-17", uploadCount: 1 },
        { uploadDate: "2026-08-10", uploadCount: 2 },
      ],
      TODAY,
      GRASS_TAB_WEEKS,
    );

    expect(summary.uploadDayCount).toBe(3);
    expect(summary.maxDailyCount).toBe(3);
    expect(summary.longestStreak).toBe(2);
  });

  it("최장 연속 일수는 연속된 날짜 구간의 최대 길이다 (AC 6)", () => {
    const summary = deriveGrassSummary(
      [
        { uploadDate: "2026-08-12", uploadCount: 1 },
        { uploadDate: "2026-08-13", uploadCount: 1 },
        { uploadDate: "2026-08-14", uploadCount: 1 },
        { uploadDate: "2026-08-16", uploadCount: 1 },
      ],
      TODAY,
      GRASS_TAB_WEEKS,
    );

    expect(summary.longestStreak).toBe(3);
  });

  it("창 밖 이력은 제외한다 — 탭은 24주, 모달은 53주 창 (AC 6)", () => {
    // 24주 창 시작은 2026-03-08 — 전날 이력은 탭 요약에서 빠지고 53주 요약에는 들어간다
    const history = [
      { uploadDate: "2026-03-07", uploadCount: 5 },
      { uploadDate: "2026-08-18", uploadCount: 1 },
    ];

    const tab = deriveGrassSummary(history, TODAY, GRASS_TAB_WEEKS);
    const modal = deriveGrassSummary(history, TODAY, GRASS_MODAL_WEEKS);

    expect(tab.uploadDayCount).toBe(1);
    expect(tab.maxDailyCount).toBe(1);
    expect(modal.uploadDayCount).toBe(2);
    expect(modal.maxDailyCount).toBe(5);
  });

  it("가장 활발한 요일은 업로드 '일수' 기준이다 — 하루 개수가 많아도 일수가 적으면 밀린다 (AC 6)", () => {
    const summary = deriveGrassSummary(
      [
        { uploadDate: "2026-08-15", uploadCount: 1 }, // 토
        { uploadDate: "2026-08-08", uploadCount: 1 }, // 토
        { uploadDate: "2026-08-10", uploadCount: 10 }, // 월
      ],
      TODAY,
      GRASS_TAB_WEEKS,
    );

    expect(summary.mostActiveWeekday).toBe("토요일");
  });

  it("요일 동률이면 주 시작(일요일)부터 앞선 요일이 이긴다 (AC 6 동률 경계)", () => {
    const summary = deriveGrassSummary(
      [
        { uploadDate: "2026-08-15", uploadCount: 2 }, // 토 1일
        { uploadDate: "2026-08-10", uploadCount: 1 }, // 월 1일
      ],
      TODAY,
      GRASS_TAB_WEEKS,
    );

    expect(summary.mostActiveWeekday).toBe("월요일");
  });
});

describe("todayKstDate — KST 고정 '오늘' 파생 (AC 4 재료)", () => {
  it("UTC 자정 전이라도 KST로 넘어간 날짜를 돌려준다", () => {
    // UTC 2026-08-17 16:00 = KST 2026-08-18 01:00
    expect(todayKstDate(Date.UTC(2026, 7, 17, 16, 0, 0))).toBe("2026-08-18");
  });

  it("KST 자정 직전은 같은 날이다 (경계)", () => {
    // UTC 2026-08-17 14:59 = KST 2026-08-17 23:59
    expect(todayKstDate(Date.UTC(2026, 7, 17, 14, 59, 0))).toBe("2026-08-17");
  });
});
