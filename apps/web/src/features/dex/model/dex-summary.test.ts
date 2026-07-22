import { describe, expect, it } from "vitest";
import type { CollectedCell, DexData, DexSummary } from "@/entities/dex";
import { cellToBounds, CELL_SIDE_METERS } from "./cell-overlay";
import { clampPct, deriveDexView, sortByCollectedAtDesc } from "./dex-summary";

const summary = (overrides: Partial<DexSummary> = {}): DexSummary => ({
  nickname: "필맵퍼",
  totalLabel: "서울",
  totalExploredPct: 37,
  streakDays: 12,
  collectedCellCount: 3,
  badgeCount: 4,
  regionName: "마포구",
  regionExploredPct: 52,
  ...overrides,
});

const cell = (
  cellId: string,
  collectedAt: string,
  overrides: Partial<CollectedCell> = {},
): CollectedCell => ({
  cellId,
  label: `격자 ${cellId}`,
  center: { lat: 37.55, lng: 126.92 },
  collectedAt,
  videoCount: 1,
  ...overrides,
});

describe("clampPct — 탐험률 0~100 클램프 (AC 7)", () => {
  it("음수는 0으로 클램프한다", () => {
    expect(clampPct(-5)).toBe(0);
  });

  it("100 초과는 100으로 클램프한다", () => {
    expect(clampPct(150)).toBe(100);
  });

  it("범위 내 값은 그대로 반환한다 (경계 0·100 포함)", () => {
    expect(clampPct(0)).toBe(0);
    expect(clampPct(68)).toBe(68);
    expect(clampPct(100)).toBe(100);
  });
});

describe("sortByCollectedAtDesc — 최근 수집 최신순 정렬 (AC 14)", () => {
  it("collectedAt 내림차순(최신순)으로 정렬한다", () => {
    const cells = [
      cell("A", "2026-07-19T09:00:00.000Z"),
      cell("B", "2026-07-21T09:00:00.000Z"),
      cell("C", "2026-07-20T09:00:00.000Z"),
    ];

    expect(sortByCollectedAtDesc(cells).map((c) => c.cellId)).toEqual([
      "B",
      "C",
      "A",
    ]);
  });

  it("동률이면 cellId 오름차순으로 안정 정렬하고, 원본 배열은 변형하지 않는다", () => {
    const cells = [
      cell("B", "2026-07-20T09:00:00.000Z"),
      cell("A", "2026-07-20T09:00:00.000Z"),
    ];
    const sorted = sortByCollectedAtDesc(cells);

    expect(sorted.map((c) => c.cellId)).toEqual(["A", "B"]);
    expect(cells.map((c) => c.cellId)).toEqual(["B", "A"]);
  });
});

describe("deriveDexView — 도감 화면 파생 (AC 7·14·17)", () => {
  it("수집 0건 입력 시 통계 0·빈 목록·오버레이 0개를 반환한다 (AC 17)", () => {
    const empty: DexData = {
      summary: summary({
        totalExploredPct: 0,
        streakDays: 0,
        collectedCellCount: 0,
        badgeCount: 0,
        regionExploredPct: 0,
      }),
      collectedCells: [],
    };

    const view = deriveDexView(empty);

    expect(view.collectedCellCount).toBe(0);
    expect(view.badgeCount).toBe(0);
    expect(view.streakDays).toBe(0);
    expect(view.totalExploredPct).toBe(0);
    expect(view.regionExploredPct).toBe(0);
    expect(view.recentCells).toEqual([]);
    expect(view.overlayCells).toEqual([]);
  });

  it("최근 수집 목록은 최신순으로 정렬되고 상한 없이 전체를 담는다 (AC 14, 추정 A6)", () => {
    const cells = [
      cell("A", "2026-07-18T09:00:00.000Z"),
      cell("B", "2026-07-21T09:00:00.000Z"),
      cell("C", "2026-07-19T09:00:00.000Z"),
      cell("D", "2026-07-20T09:00:00.000Z"),
    ];

    const view = deriveDexView({ summary: summary(), collectedCells: cells });

    expect(view.recentCells.map((c) => c.cellId)).toEqual(["B", "D", "C", "A"]);
  });

  it("수집 격자마다 id + Bounds(한 변 500m mock 상수) 오버레이를 만든다 (AC 9·10)", () => {
    const target = cell("A-14", "2026-07-21T09:00:00.000Z", {
      center: { lat: 37.5573, lng: 126.9245 },
    });

    const view = deriveDexView({
      summary: summary(),
      collectedCells: [target],
    });

    expect(view.overlayCells).toEqual([
      { id: "A-14", bounds: cellToBounds(target.center, CELL_SIDE_METERS) },
    ]);
  });

  it("탐험률(전체·지역)은 0~100으로 클램프해 담는다 (AC 7)", () => {
    const view = deriveDexView({
      summary: summary({ totalExploredPct: -10, regionExploredPct: 120 }),
      collectedCells: [],
    });

    expect(view.totalExploredPct).toBe(0);
    expect(view.regionExploredPct).toBe(100);
  });

  it("요약 표시값(닉네임·라벨·지역명)을 그대로 전달한다", () => {
    const view = deriveDexView({ summary: summary(), collectedCells: [] });

    expect(view.nickname).toBe("필맵퍼");
    expect(view.totalLabel).toBe("서울");
    expect(view.regionName).toBe("마포구");
  });
});
