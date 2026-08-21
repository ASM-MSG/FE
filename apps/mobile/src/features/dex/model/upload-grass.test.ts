import { afterEach, describe, expect, it } from "vitest";
import type { UploadHistoryDay } from "../../../entities/dex/model/dex";
import {
  GRASS_MODAL_WEEKS,
  GRASS_TAB_WEEKS,
  buildGrassWeeks,
  deriveGrassSummary,
  deriveMonthLabels,
  grassLevel,
  todayKstDate,
} from "./upload-grass";

/** 부산 서면 사용자의 희소 업로드 이력 — 오늘은 2026-08-19(수) 고정 */
const TODAY = "2026-08-19";
const HISTORY: UploadHistoryDay[] = [
  { uploadDate: "2026-08-08", uploadCount: 1 },
  { uploadDate: "2026-08-15", uploadCount: 1 },
  { uploadDate: "2026-08-16", uploadCount: 2 },
  { uploadDate: "2026-08-17", uploadCount: 5 },
  { uploadDate: "2026-08-19", uploadCount: 3 },
  // 24주 창(2026-03-08 시작) 밖 — 53주 창에는 들어온다
  { uploadDate: "2026-01-10", uploadCount: 4 },
];

describe("buildGrassWeeks — 잔디 격자 파생 (L4)", () => {
  it("24주 창을 주=열 · 0행=일요일 격자로 파생한다", () => {
    const weeks = buildGrassWeeks(HISTORY, TODAY, GRASS_TAB_WEEKS);
    expect(weeks).toHaveLength(GRASS_TAB_WEEKS);
    expect(weeks[0][0]).toEqual({ date: "2026-03-08", count: 0 });
    expect(weeks[23][0]).toEqual({ date: "2026-08-16", count: 2 });
  });

  it("이력에 없는 날은 count 0으로 채운다", () => {
    const weeks = buildGrassWeeks(HISTORY, TODAY, GRASS_TAB_WEEKS);
    expect(weeks[23][1]).toEqual({ date: "2026-08-17", count: 5 });
    expect(weeks[23][2]).toEqual({ date: "2026-08-18", count: 0 });
  });

  it("마지막 주의 미래 날짜는 null이다 (자리 없음)", () => {
    const weeks = buildGrassWeeks(HISTORY, TODAY, GRASS_TAB_WEEKS);
    expect(weeks[23][3]).toEqual({ date: "2026-08-19", count: 3 });
    expect(weeks[23][4]).toBeNull();
    expect(weeks[23][6]).toBeNull();
  });

  it("53주 창은 1년 전 일요일에서 시작한다", () => {
    const weeks = buildGrassWeeks(HISTORY, TODAY, GRASS_MODAL_WEEKS);
    expect(weeks).toHaveLength(GRASS_MODAL_WEEKS);
    expect(weeks[0][0]).toEqual({ date: "2025-08-17", count: 0 });
  });
});

describe("grassLevel — 5단 임계 (L4)", () => {
  it("0/1/2/3/4+ 고정 임계로 레벨을 낸다", () => {
    expect([0, 1, 2, 3, 4, 12].map(grassLevel)).toEqual([0, 1, 2, 3, 4, 4]);
  });
});

describe("deriveMonthLabels — 월 라벨 (L4)", () => {
  it("실제 월 경계(첫 열 포함) 기준으로 라벨을 단다", () => {
    const weeks = buildGrassWeeks(HISTORY, TODAY, GRASS_TAB_WEEKS);
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

describe("deriveGrassSummary — 창 내 요약 (L4)", () => {
  it("창 안의 업로드 일수·최장 연속·하루 최다·가장 활발한 요일을 낸다", () => {
    expect(deriveGrassSummary(HISTORY, TODAY, GRASS_TAB_WEEKS)).toEqual({
      uploadDayCount: 5,
      longestStreak: 3,
      maxDailyCount: 5,
      mostActiveWeekday: "토요일",
    });
  });

  it("창 밖 이력은 집계에서 제외된다 (24주 5일 vs 53주 6일)", () => {
    expect(
      deriveGrassSummary(HISTORY, TODAY, GRASS_MODAL_WEEKS).uploadDayCount,
    ).toBe(6);
  });

  it("업로드가 0건이면 가장 활발한 요일이 null이다 (빈 상태)", () => {
    expect(deriveGrassSummary([], TODAY, GRASS_TAB_WEEKS)).toEqual({
      uploadDayCount: 0,
      longestStreak: 0,
      maxDailyCount: 0,
      mostActiveWeekday: null,
    });
  });

  it("요일 동률이면 주 시작(일요일)부터 앞선 요일이 이긴다", () => {
    const tie: UploadHistoryDay[] = [
      { uploadDate: "2026-08-16", uploadCount: 1 }, // 일요일
      { uploadDate: "2026-08-17", uploadCount: 1 }, // 월요일
    ];
    expect(
      deriveGrassSummary(tie, TODAY, GRASS_TAB_WEEKS).mostActiveWeekday,
    ).toBe("일요일");
  });
});

describe("날짜 산술이 실행 환경 타임존과 무관하게 결정적이다 (L5)", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("TZ=UTC와 TZ=America/New_York에서 같은 격자·요약이 나온다", () => {
    process.env.TZ = "UTC";
    const utcWeeks = buildGrassWeeks(HISTORY, TODAY, GRASS_TAB_WEEKS);
    const utcSummary = deriveGrassSummary(HISTORY, TODAY, GRASS_TAB_WEEKS);
    const utcToday = todayKstDate(Date.UTC(2026, 7, 19, 20, 0, 0));

    process.env.TZ = "America/New_York";
    expect(buildGrassWeeks(HISTORY, TODAY, GRASS_TAB_WEEKS)).toEqual(utcWeeks);
    expect(deriveGrassSummary(HISTORY, TODAY, GRASS_TAB_WEEKS)).toEqual(
      utcSummary,
    );
    expect(todayKstDate(Date.UTC(2026, 7, 19, 20, 0, 0))).toBe(utcToday);
  });

  it("todayKstDate가 KST 자정 경계를 UTC+9로 넘긴다", () => {
    // UTC 2026-08-19 15:00 = KST 2026-08-20 00:00
    expect(todayKstDate(Date.UTC(2026, 7, 19, 14, 59, 0))).toBe("2026-08-19");
    expect(todayKstDate(Date.UTC(2026, 7, 19, 15, 0, 0))).toBe("2026-08-20");
  });
});
