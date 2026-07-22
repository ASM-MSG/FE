import { describe, expect, it } from "vitest";
import type {
  CollectedCell,
  DexBadge,
  DexData,
  DexSummary,
} from "@/entities/dex";
import { cellToBounds, CELL_SIDE_METERS } from "./cell-overlay";
import {
  RECENT_CELLS_LIMIT,
  clampPct,
  deriveDexView,
  excludeRemoved,
  formatExploredPct,
  selectRecentCells,
  sortByCollectedAtDesc,
} from "./dex-summary";

const summary = (overrides: Partial<DexSummary> = {}): DexSummary => ({
  nickname: "필맵퍼",
  totalExploredPct: 0.012,
  streakDays: 12,
  collectedCellCount: 3,
  badgeCount: 4,
  ...overrides,
});

const REGION_PCT_MAP = { 부산진구: 52, 수영구: 34 };

/** 뱃지 카탈로그 픽스처 — 획득·미획득 혼재 (MSG-123 패스스루 판정용) */
const BADGES: DexBadge[] = [
  { id: "first-record", name: "첫 기록", earned: true },
  { id: "busan-conquest", name: "부산 정복", earned: false },
];

const dexData = (
  collectedCells: CollectedCell[],
  summaryOverrides: Partial<DexSummary> = {},
): DexData => ({
  summary: summary(summaryOverrides),
  collectedCells,
  badges: BADGES,
  regionExploredPctMap: REGION_PCT_MAP,
});

const cell = (
  cellId: string,
  collectedAt: string,
  overrides: Partial<CollectedCell> = {},
): CollectedCell => ({
  cellId,
  label: `격자 ${cellId}`,
  district: "부산진구",
  center: { lat: 35.16, lng: 129.06 },
  collectedAt,
  videoCount: 1,
  ...overrides,
});

/** n개의 수집 격자를 생성 — 인덱스 i가 클수록 최신(collectedAt이 늦음) */
const manyCells = (n: number): CollectedCell[] =>
  Array.from({ length: n }, (_, i) =>
    cell(
      `C-${String(i).padStart(2, "0")}`,
      new Date(Date.UTC(2026, 5, 1) + i * 60_000).toISOString(),
    ),
  );

describe("clampPct — 탐험률 0~100 클램프 (AC 7)", () => {
  it("음수는 0으로 클램프한다", () => {
    expect(clampPct(-5)).toBe(0);
  });

  it("100 초과는 100으로 클램프한다", () => {
    expect(clampPct(150)).toBe(100);
  });

  it("범위 내 값은 그대로 반환한다 (경계 0·100, 미소값 포함)", () => {
    expect(clampPct(0)).toBe(0);
    expect(clampPct(68)).toBe(68);
    expect(clampPct(100)).toBe(100);
    expect(clampPct(0.012)).toBe(0.012);
  });
});

describe("formatExploredPct — 전체 진행률 포맷 (AC 20, 개정 D1·A12)", () => {
  it("1% 미만은 유효숫자 2자리로 표기한다 ('0.012%')", () => {
    expect(formatExploredPct(0.012)).toBe("0.012%");
    expect(formatExploredPct(0.0123)).toBe("0.012%");
    expect(formatExploredPct(0.0046)).toBe("0.0046%");
    expect(formatExploredPct(0.5)).toBe("0.50%");
  });

  it("1% 이상은 소수 첫째 자리로 표기한다 ('1.2%')", () => {
    expect(formatExploredPct(1.2)).toBe("1.2%");
    expect(formatExploredPct(68.35)).toBe("68.4%");
  });

  it("1% 이상에서 정수면 소수 없이 정수로 표기한다 ('68%')", () => {
    expect(formatExploredPct(68)).toBe("68%");
    expect(formatExploredPct(68.04)).toBe("68%");
    expect(formatExploredPct(100)).toBe("100%");
  });

  it("0은 '0%'로 표기한다 (신규 사용자)", () => {
    expect(formatExploredPct(0)).toBe("0%");
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

describe("selectRecentCells — 최신순 정렬 + 상한 30 (AC 14 개정 D3)", () => {
  it("상한 상수는 30이다", () => {
    expect(RECENT_CELLS_LIMIT).toBe(30);
  });

  it("31개 이상 입력 시 최신 30개만 반환한다 — 가장 오래된 항목이 탈락한다", () => {
    const cells = manyCells(31); // C-00(최고령) ~ C-30(최신)
    const recent = selectRecentCells(cells);

    expect(recent.length).toBe(30);
    expect(recent[0].cellId).toBe("C-30"); // 최신이 맨 앞
    expect(recent[29].cellId).toBe("C-01");
    expect(recent.some((c) => c.cellId === "C-00")).toBe(false); // 최고령 탈락
  });

  it("30개 이하 입력은 전체를 최신순으로 반환한다", () => {
    const recent = selectRecentCells(manyCells(3));

    expect(recent.map((c) => c.cellId)).toEqual(["C-02", "C-01", "C-00"]);
  });
});

describe("excludeRemoved — 표시 목록에서 제거 항목 제외 (AC 23, 개정 D4)", () => {
  it("removedIds에 있는 항목만 제외하고 나머지 순서를 유지한다", () => {
    const visible = excludeRemoved(selectRecentCells(manyCells(3)), ["C-01"]);

    expect(visible.map((c) => c.cellId)).toEqual(["C-02", "C-00"]);
  });

  it("정렬·상한 파생 이후에 적용된다 — 상위 30에서 1개 제거해도 31번째가 복귀하지 않는다", () => {
    const visible = excludeRemoved(selectRecentCells(manyCells(31)), ["C-30"]);

    expect(visible.length).toBe(29);
    expect(visible.some((c) => c.cellId === "C-00")).toBe(false);
  });

  it("빈 removedIds면 입력을 그대로 반환한다", () => {
    const recent = selectRecentCells(manyCells(2));

    expect(excludeRemoved(recent, [])).toEqual(recent);
  });
});

describe("deriveDexView — 도감 화면 파생 (AC 7·14·17·23)", () => {
  it("수집 0건 입력 시 통계 0·빈 목록·오버레이 0개를 반환한다 (AC 17)", () => {
    const view = deriveDexView(
      dexData([], {
        totalExploredPct: 0,
        streakDays: 0,
        collectedCellCount: 0,
        badgeCount: 0,
      }),
    );

    expect(view.collectedCellCount).toBe(0);
    expect(view.badgeCount).toBe(0);
    expect(view.streakDays).toBe(0);
    expect(view.totalExploredPct).toBe(0);
    expect(view.recentCells).toEqual([]);
    expect(view.overlayCells).toEqual([]);
  });

  it("최근 수집 목록은 최신순 최대 30개다 (AC 14 개정 D3)", () => {
    const view = deriveDexView(dexData(manyCells(31)));

    expect(view.recentCells.length).toBe(30);
    expect(view.recentCells[0].cellId).toBe("C-30");
  });

  it("수집 격자마다 id + Bounds(한 변 500m mock 상수) 오버레이를 만든다 (AC 9·10)", () => {
    const target = cell("A-14", "2026-07-21T09:00:00.000Z", {
      center: { lat: 35.1573, lng: 129.0586 },
    });

    const view = deriveDexView(dexData([target]));

    expect(view.overlayCells).toEqual([
      { id: "A-14", bounds: cellToBounds(target.center, CELL_SIDE_METERS) },
    ]);
  });

  it("전체 진행률은 0~100으로 클램프하되 mock 미소값(0.012)은 그대로 담는다 (AC 7, 개정 D1)", () => {
    expect(
      deriveDexView(dexData([], { totalExploredPct: -10 })).totalExploredPct,
    ).toBe(0);
    expect(
      deriveDexView(dexData([], { totalExploredPct: 150 })).totalExploredPct,
    ).toBe(100);
    expect(
      deriveDexView(dexData([], { totalExploredPct: 0.012 })).totalExploredPct,
    ).toBe(0.012);
  });

  it("요약 표시값(닉네임)과 지역별 탐험률 맵을 그대로 전달한다", () => {
    const view = deriveDexView(dexData([]));

    expect(view.nickname).toBe("필맵퍼");
    expect(view.regionExploredPctMap).toEqual(REGION_PCT_MAP);
  });

  it("뱃지 카탈로그를 재정렬·필터 없이 그대로 전달한다 — 프리뷰 파생은 뱃지 탭(deriveBadgePreview) 몫 (MSG-123 AC 3·5)", () => {
    const view = deriveDexView(dexData([]));

    expect(view.badges).toEqual(BADGES);
  });

  it("통계·오버레이 파생의 입력은 제거 상태와 무관하다 — 같은 입력이면 같은 결과다 (AC 23·24)", () => {
    const data = dexData(manyCells(3), { collectedCellCount: 3 });

    const before = deriveDexView(data);
    // 표시 목록만 excludeRemoved로 줄어들 뿐, 파생 입력(DexData)은 불변이다
    const visible = excludeRemoved(before.recentCells, ["C-01"]);
    const after = deriveDexView(data);

    expect(visible.length).toBe(2);
    expect(after.overlayCells).toEqual(before.overlayCells);
    expect(after.overlayCells.length).toBe(3);
    expect(after.collectedCellCount).toBe(3);
  });
});
