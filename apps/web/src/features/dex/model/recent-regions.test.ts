import { describe, expect, it } from "vitest";
import type { CollectedGrid } from "@/entities/dex";
import { deriveRecentRegions, excludeRemovedRegions } from "./recent-regions";

const grid = (over: Partial<CollectedGrid>): CollectedGrid => ({
  gridId: "39064_112221",
  gridY: 39064,
  gridX: 112221,
  lastUploadedAt: "2026-08-10T09:00:00Z",
  videoCount: 1,
  regionName: "부전제1동",
  zoneName: "서면",
  zoneCell: "A-14",
  ...over,
});

describe("deriveRecentRegions — 수집 격자를 행정동으로 묶는다 (기준 5)", () => {
  it("같은 행정동의 격자를 한 행으로 합치고 격자 수·영상 수를 합산한다", () => {
    const rows = deriveRecentRegions([
      grid({ gridId: "1_1", videoCount: 4 }),
      grid({ gridId: "1_2", videoCount: 5 }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      regionName: "부전제1동",
      gridCount: 2,
      videoCount: 9,
    });
  });

  it("동 행을 그 동의 가장 최근 업로드 시각 내림차순으로 정렬한다", () => {
    const rows = deriveRecentRegions([
      grid({
        gridId: "1_1",
        regionName: "전포동",
        lastUploadedAt: "2026-08-01T00:00:00Z",
      }),
      grid({
        gridId: "2_1",
        regionName: "부전제1동",
        lastUploadedAt: "2026-08-09T00:00:00Z",
      }),
      grid({
        gridId: "2_2",
        regionName: "부전제1동",
        lastUploadedAt: "2026-08-12T00:00:00Z",
      }),
    ]);

    expect(rows.map((r) => r.regionName)).toEqual(["부전제1동", "전포동"]);
    expect(rows[0]?.lastUploadedAt).toBe("2026-08-12T00:00:00Z");
  });

  it("동 행의 대표 격자는 그 동에서 가장 최근 업로드된 격자다 — by-grid 조회 입력 (기준 11)", () => {
    const rows = deriveRecentRegions([
      grid({ gridId: "old", lastUploadedAt: "2026-08-01T00:00:00Z" }),
      grid({ gridId: "new", lastUploadedAt: "2026-08-12T00:00:00Z" }),
    ]);

    expect(rows[0]?.sampleGridId).toBe("new");
  });

  it("regionName이 null인 격자(무귀속·미판정)는 목록에서 제외한다 (기준 7 경계)", () => {
    const rows = deriveRecentRegions([
      grid({ gridId: "1_1", regionName: null }),
      grid({ gridId: "1_2", regionName: "전포동" }),
    ]);

    expect(rows.map((r) => r.regionName)).toEqual(["전포동"]);
  });

  it("수집 격자가 없으면 빈 목록이다 (경계)", () => {
    expect(deriveRecentRegions([])).toEqual([]);
  });
});

describe("excludeRemovedRegions — X로 감춘 동을 표시 목록에서 뺀다 (기준 8)", () => {
  it("감춘 동 이름만 제외하고 나머지는 순서를 유지한다", () => {
    const rows = deriveRecentRegions([
      grid({
        gridId: "1_1",
        regionName: "부전제1동",
        lastUploadedAt: "2026-08-12T00:00:00Z",
      }),
      grid({
        gridId: "2_1",
        regionName: "전포동",
        lastUploadedAt: "2026-08-11T00:00:00Z",
      }),
    ]);

    expect(
      excludeRemovedRegions(rows, ["부전제1동"]).map((r) => r.regionName),
    ).toEqual(["전포동"]);
  });
});
