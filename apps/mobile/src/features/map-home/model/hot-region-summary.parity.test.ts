import { describe, expect, it } from "vitest";
import {
  HOT_SAMPLE_GRID_LIMIT,
  deriveHotRegionStats,
  hotZoneSampleGridIds,
} from "./hot-region-summary";

/**
 * B4·B5: `hotZoneSampleGridIds`가 핫스코어 내림차순 상위 `HOT_SAMPLE_GRID_LIMIT(=5)`개
 * 격자 id를 반환하고, `deriveHotRegionStats`가 표본 영상 + 내 영상 수 + `now`에서 4개
 * 수치를 파생하며 `viewCount`가 null인 영상은 조회수 합계에서 빠지되 영상 수에는
 * 포함된다 (MSG-427) — 웹 원본 동등.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/hot-region-summary.ts",
  import.meta.url,
).pathname;

interface WebHotRegion {
  HOT_SAMPLE_GRID_LIMIT: number;
  hotZoneSampleGridIds: typeof hotZoneSampleGridIds;
  deriveHotRegionStats: typeof deriveHotRegionStats;
}

const loadWeb = (): Promise<WebHotRegion> => import(WEB_PATH);

const ZONES = [
  { gridId: "g1", score: 4 },
  { gridId: "g2", score: 9 },
  { gridId: "g3", score: 1 },
  { gridId: "g4", score: 7 },
  { gridId: "g5", score: 2 },
  { gridId: "g6", score: 8 },
];

const NOW = new Date(2026, 7, 19, 13, 0, 0);
const VIDEOS = [
  { recordedAt: "2026-08-19T09:00:00", viewCount: 100 },
  { recordedAt: "2026-08-18T20:00:00", viewCount: null },
  { recordedAt: "2026-08-10T20:00:00", viewCount: 25 },
];

describe("hot-region-summary 웹 원본 동등성 (B4·B5)", () => {
  it("핫스코어 내림차순 상위 5개 격자 id를 표본으로 삼는다", () => {
    expect(HOT_SAMPLE_GRID_LIMIT).toBe(5);
    expect(hotZoneSampleGridIds(ZONES, HOT_SAMPLE_GRID_LIMIT)).toEqual([
      "g2",
      "g6",
      "g4",
      "g1",
      "g5",
    ]);
  });

  it("viewCount가 null인 영상은 조회수 합계에서 빠지되 영상 수에는 포함된다", () => {
    expect(
      deriveHotRegionStats({ videos: VIDEOS, myVideoCount: 2, now: NOW }),
    ).toEqual({
      videoCount: 3,
      viewCount: 125,
      recentCount: 2,
      myVideoCount: 2,
    });
  });

  it("표본 전건에서 웹 원본과 같은 수치를 낸다", async () => {
    const web = await loadWeb();

    expect(HOT_SAMPLE_GRID_LIMIT).toBe(web.HOT_SAMPLE_GRID_LIMIT);
    expect(hotZoneSampleGridIds(ZONES, HOT_SAMPLE_GRID_LIMIT)).toEqual(
      web.hotZoneSampleGridIds(ZONES, web.HOT_SAMPLE_GRID_LIMIT),
    );
    expect(
      deriveHotRegionStats({ videos: VIDEOS, myVideoCount: 2, now: NOW }),
    ).toEqual(
      web.deriveHotRegionStats({ videos: VIDEOS, myVideoCount: 2, now: NOW }),
    );
  });
});
