import { describe, expect, it } from "vitest";
import type { MissionResponseDto } from "../../../shared/api/sdk";
import {
  boundsIntersect,
  missionChipOfTheme,
  missionCoversGrid,
  missionGridIdsInBounds,
  missionShapeOf,
  missionTypeParam,
} from "./mission";
import type { Bounds } from "../../../entities/cell/model/grid";

/**
 * D1·F-12: 칩 → `type` 파라미터 매핑(EVENT/POPUP/COURSE), shape의 런타임 판별(필드 유무),
 * 그리고 **뷰포트 범위 안에서만** 미션 격자를 펼치는 클리핑이 웹 원본과 같다 (MSG-427).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/mission.ts",
  import.meta.url,
).pathname;

interface WebMission {
  missionChipOfTheme: typeof missionChipOfTheme;
  missionTypeParam: typeof missionTypeParam;
  missionShapeOf: typeof missionShapeOf;
  missionCoversGrid: typeof missionCoversGrid;
  boundsIntersect: typeof boundsIntersect;
  missionGridIdsInBounds: typeof missionGridIdsInBounds;
}

const loadWeb = (): Promise<WebMission> => import(WEB_PATH);

const baseMission = (shape: unknown): MissionResponseDto =>
  ({
    missionId: 1,
    type: "EVENT",
    title: "서면 여름축제",
    targetCount: 3,
    startAt: null,
    endAt: null,
    shape,
    description: null,
    placeName: "부산 부산진구 서면",
    sourceUrl: null,
    operationTime: null,
    imageUrl: null,
    distanceMeters: null,
    durationMinutes: null,
    difficulty: null,
  }) as unknown as MissionResponseDto;

/** 서면 인근 폴리곤 — 약 300m 사방 */
const BOX_MISSION = baseMission({
  polygon: [
    { lat: 35.155, lng: 129.056 },
    { lat: 35.16, lng: 129.056 },
    { lat: 35.16, lng: 129.062 },
    { lat: 35.155, lng: 129.062 },
  ],
});
const PATH_MISSION = baseMission({
  line: '{"type":"LineString","coordinates":[[129.0594,35.1578],[129.0652,35.1631]]}',
  spots: [
    { gridId: "16858_11420", lat: 35.1578, lng: 129.0594, seq: 1 },
    { gridId: "16882_11434", lat: 35.1631, lng: 129.0652, seq: 2 },
  ],
});
const CELLS_MISSION = baseMission({
  cells: [{ gridId: "16858_11420", lat: 35.1578, lng: 129.0594 }],
});
const REGION_MISSION = baseMission({ regionCode: "2647051000" });
const BROKEN_MISSION = baseMission(null);

const MISSIONS = [
  BOX_MISSION,
  PATH_MISSION,
  CELLS_MISSION,
  REGION_MISSION,
  BROKEN_MISSION,
];

/** 폴리곤을 품는 뷰포트 · 폴리곤 일부만 걸치는 뷰포트 · 완전히 벗어난 뷰포트 */
const VIEWPORTS: Bounds[] = [
  { sw: { lat: 35.15, lng: 129.05 }, ne: { lat: 35.165, lng: 129.07 } },
  { sw: { lat: 35.155, lng: 129.056 }, ne: { lat: 35.1575, lng: 129.059 } },
  { sw: { lat: 35.2, lng: 129.2 }, ne: { lat: 35.21, lng: 129.21 } },
];

describe("mission 웹 원본 동등성 (D1·F-12)", () => {
  it("핫구역에는 미션이 없고, 칩은 EVENT·POPUP·COURSE로 매핑된다", () => {
    expect(missionChipOfTheme(null)).toBeNull();
    expect(missionChipOfTheme("hot")).toBeNull();
    expect(missionChipOfTheme("festival")).toBe("festival");
    expect(missionTypeParam("festival")).toBe("EVENT");
    expect(missionTypeParam("popup")).toBe("POPUP");
    expect(missionTypeParam("route")).toBe("COURSE");
  });

  it("shape는 type이 아니라 필드 유무로 판별된다 — POPUP도 폴리곤을 받는다", () => {
    expect(missionShapeOf(BOX_MISSION).kind).toBe("box");
    expect(missionShapeOf(PATH_MISSION).kind).toBe("path");
    expect(missionShapeOf(CELLS_MISSION).kind).toBe("cells");
    expect(missionShapeOf(REGION_MISSION).kind).toBe("none");
    expect(missionShapeOf(BROKEN_MISSION).kind).toBe("none");
  });

  it("미션 격자는 뷰포트 범위로 클리핑된다 — 뷰포트 밖 격자를 만들지 않는다 (F-12)", () => {
    const shape = missionShapeOf(BOX_MISSION);
    const wide = missionGridIdsInBounds(shape, VIEWPORTS[0]);
    const narrow = missionGridIdsInBounds(shape, VIEWPORTS[1]);
    const outside = missionGridIdsInBounds(shape, VIEWPORTS[2]);

    expect(wide.length).toBeGreaterThan(0);
    expect(narrow.length).toBeGreaterThan(0);
    expect(narrow.length).toBeLessThan(wide.length);
    expect(outside).toEqual([]);
  });

  it("칩 매핑 2종이 전 입력에서 웹 원본과 같은 값을 낸다", async () => {
    const web = await loadWeb();

    for (const theme of [null, "hot", "festival", "popup", "route"] as const) {
      expect(missionChipOfTheme(theme)).toBe(web.missionChipOfTheme(theme));
    }
    for (const chip of ["festival", "popup", "route"] as const) {
      expect(missionTypeParam(chip)).toBe(web.missionTypeParam(chip));
    }
  });

  it("표본 전건에서 웹 원본과 같은 도형·격자·포함 판정을 낸다", async () => {
    const web = await loadWeb();

    for (const mission of MISSIONS) {
      const mine = missionShapeOf(mission);
      const theirs = web.missionShapeOf(mission);
      expect(mine).toEqual(theirs);

      for (const bounds of VIEWPORTS) {
        expect(missionGridIdsInBounds(mine, bounds)).toEqual(
          web.missionGridIdsInBounds(theirs, bounds),
        );
        if (mine.bbox)
          expect(boundsIntersect(mine.bbox, bounds)).toBe(
            web.boundsIntersect(theirs.bbox!, bounds),
          );
      }

      const center = { lat: 35.1578, lng: 129.0594 };
      expect(missionCoversGrid(mine, "16858_11420", center)).toBe(
        web.missionCoversGrid(theirs, "16858_11420", center),
      );
    }
  });
});
