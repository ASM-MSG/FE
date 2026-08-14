import { describe, expect, it } from "vitest";
import {
  deriveHotRegionStats,
  hotZoneSampleGridIds,
} from "./hot-region-summary";

const NOW = new Date("2026-08-14T10:00:00+09:00");

const video = (over: { recordedAt: string; viewCount?: number | null }) => ({
  viewCount: null,
  ...over,
});

describe("hotZoneSampleGridIds — 요약에 쓸 핫구역 격자를 추린다 (AC 9)", () => {
  it("핫스코어 내림차순 상위 격자만 남긴다 (AC 9)", () => {
    const ids = hotZoneSampleGridIds(
      [
        { gridId: "a", score: 1 },
        { gridId: "b", score: 9 },
        { gridId: "c", score: 5 },
      ],
      2,
    );

    expect(ids).toEqual(["b", "c"]);
  });

  it("격자가 상한보다 적으면 전부 남긴다 (경계)", () => {
    expect(hotZoneSampleGridIds([{ gridId: "a", score: 1 }], 5)).toEqual(["a"]);
  });

  it("핫구역이 없으면 빈 목록이다 (경계)", () => {
    expect(hotZoneSampleGridIds([], 5)).toEqual([]);
  });
});

describe("deriveHotRegionStats — 동 요약 스탯을 만든다 (AC 9)", () => {
  it("표본 영상 수와 조회수 합을 낸다 (AC 9)", () => {
    const stats = deriveHotRegionStats({
      videos: [
        video({ recordedAt: "2026-08-01T10:00:00Z", viewCount: 1400 }),
        video({ recordedAt: "2026-08-02T10:00:00Z", viewCount: 200 }),
      ],
      myVideoCount: 1,
      now: NOW,
    });

    expect(stats.videoCount).toBe(2);
    expect(stats.viewCount).toBe(1600);
    expect(stats.myVideoCount).toBe(1);
  });

  it("조회수를 못 구한 영상은 합계에서 제외한다 (AC 9)", () => {
    const stats = deriveHotRegionStats({
      videos: [
        video({ recordedAt: "2026-08-01T10:00:00Z", viewCount: null }),
        video({ recordedAt: "2026-08-02T10:00:00Z", viewCount: 300 }),
      ],
      myVideoCount: 0,
      now: NOW,
    });

    expect(stats.viewCount).toBe(300);
    expect(stats.videoCount).toBe(2);
  });

  it("최근 24시간 안에 올라온 영상을 따로 센다 (AC 9)", () => {
    const stats = deriveHotRegionStats({
      videos: [
        video({ recordedAt: "2026-08-14T09:00:00+09:00" }),
        video({ recordedAt: "2026-08-13T20:00:00+09:00" }),
        video({ recordedAt: "2026-08-10T10:00:00+09:00" }),
      ],
      myVideoCount: 0,
      now: NOW,
    });

    expect(stats.recentCount).toBe(2);
  });

  it("영상이 없으면 모든 스탯이 0이다 (경계)", () => {
    const stats = deriveHotRegionStats({
      videos: [],
      myVideoCount: 0,
      now: NOW,
    });

    expect(stats).toEqual({
      videoCount: 0,
      viewCount: 0,
      recentCount: 0,
      myVideoCount: 0,
    });
  });
});
