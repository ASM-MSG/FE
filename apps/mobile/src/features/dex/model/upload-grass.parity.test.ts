import { describe, expect, it } from "vitest";
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

/**
 * L4·L5 parity: 모바일 `upload-grass` ↔ 웹 `features/dex/model/upload-grass.ts`.
 * 잔디는 웹(MSG-414)이 확정한 창·임계·요약 규칙을 그대로 옮긴 것이라, 한쪽만 바뀌면
 * 같은 이력이 두 앱에서 다르게 보인다 — 드리프트를 이 테스트가 먼저 알린다.
 */
interface WebUploadGrassModule {
  GRASS_TAB_WEEKS: typeof GRASS_TAB_WEEKS;
  GRASS_MODAL_WEEKS: typeof GRASS_MODAL_WEEKS;
  todayKstDate: typeof todayKstDate;
  buildGrassWeeks: typeof buildGrassWeeks;
  grassLevel: typeof grassLevel;
  deriveMonthLabels: typeof deriveMonthLabels;
  deriveGrassSummary: typeof deriveGrassSummary;
}

const WEB_PATH = new URL(
  "../../../../../web/src/features/dex/model/upload-grass.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<WebUploadGrassModule> => import(WEB_PATH);

const TODAY = "2026-08-19";
const HISTORY: UploadHistoryDay[] = [
  { uploadDate: "2026-08-08", uploadCount: 1 },
  { uploadDate: "2026-08-15", uploadCount: 1 },
  { uploadDate: "2026-08-16", uploadCount: 2 },
  { uploadDate: "2026-08-17", uploadCount: 5 },
  { uploadDate: "2026-08-19", uploadCount: 3 },
  { uploadDate: "2026-01-10", uploadCount: 4 },
];

describe("upload-grass 동등성 (L4·L5)", () => {
  it("창 상수가 웹 원본과 같다 (24주·53주)", async () => {
    const web = await loadWeb();
    expect(GRASS_TAB_WEEKS).toBe(web.GRASS_TAB_WEEKS);
    expect(GRASS_MODAL_WEEKS).toBe(web.GRASS_MODAL_WEEKS);
  });

  it("buildGrassWeeks가 24주·53주 창에서 웹 원본과 같은 격자를 낸다", async () => {
    const web = await loadWeb();
    for (const weeks of [GRASS_TAB_WEEKS, GRASS_MODAL_WEEKS]) {
      expect(buildGrassWeeks(HISTORY, TODAY, weeks)).toEqual(
        web.buildGrassWeeks(HISTORY, TODAY, weeks),
      );
    }
    expect(buildGrassWeeks([], TODAY, GRASS_TAB_WEEKS)).toEqual(
      web.buildGrassWeeks([], TODAY, GRASS_TAB_WEEKS),
    );
  });

  it("grassLevel 임계가 웹 원본과 같다", async () => {
    const web = await loadWeb();
    for (const count of [-1, 0, 1, 2, 3, 4, 99]) {
      expect(grassLevel(count)).toBe(web.grassLevel(count));
    }
  });

  it("deriveMonthLabels가 웹 원본과 같다", async () => {
    const web = await loadWeb();
    const weeks = buildGrassWeeks(HISTORY, TODAY, GRASS_TAB_WEEKS);
    expect(deriveMonthLabels(weeks)).toEqual(web.deriveMonthLabels(weeks));
  });

  it("deriveGrassSummary가 웹 원본과 같다 (이력 있음·없음)", async () => {
    const web = await loadWeb();
    expect(deriveGrassSummary(HISTORY, TODAY, GRASS_TAB_WEEKS)).toEqual(
      web.deriveGrassSummary(HISTORY, TODAY, GRASS_TAB_WEEKS),
    );
    expect(deriveGrassSummary(HISTORY, TODAY, GRASS_MODAL_WEEKS)).toEqual(
      web.deriveGrassSummary(HISTORY, TODAY, GRASS_MODAL_WEEKS),
    );
    expect(deriveGrassSummary([], TODAY, GRASS_TAB_WEEKS)).toEqual(
      web.deriveGrassSummary([], TODAY, GRASS_TAB_WEEKS),
    );
  });

  it("todayKstDate가 KST 경계에서 웹 원본과 같다", async () => {
    const web = await loadWeb();
    for (const ms of [
      Date.UTC(2026, 7, 19, 14, 59),
      Date.UTC(2026, 7, 19, 15, 0),
    ]) {
      expect(todayKstDate(ms)).toBe(web.todayKstDate(ms));
    }
  });
});
