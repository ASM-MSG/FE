import { describe, expect, it } from "vitest";
import type { DexBadge } from "@/entities/dex";
import {
  featuredRankOf,
  initialFeaturedSelection,
  toggleFeatured,
} from "./featured-selection";

const badge = (
  overrides: Partial<DexBadge> & { badgeId: number },
): DexBadge => ({
  code: `BADGE_${overrides.badgeId}`,
  name: `뱃지 ${overrides.badgeId}`,
  earned: true,
  iconUrl: null,
  earnedAt: "2026-08-01T00:00:00",
  featuredRank: null,
  ...overrides,
});

describe("initialFeaturedSelection — 서버 featuredRank로 초기 선택 파생 (AC 3)", () => {
  it("featuredRank 1·2 뱃지가 랭크 순서의 badgeId 배열이 된다", () => {
    const badges = [
      badge({ badgeId: 7, featuredRank: 2 }),
      badge({ badgeId: 3 }),
      badge({ badgeId: 5, featuredRank: 1 }),
    ];

    expect(initialFeaturedSelection(badges)).toEqual([5, 7]);
  });

  it("대표 뱃지가 없으면 빈 선택이 된다 (경계)", () => {
    expect(initialFeaturedSelection([badge({ badgeId: 1 })])).toEqual([]);
  });
});

describe("toggleFeatured — 획득 뱃지 클릭 시 선택 토글 (AC 3·4)", () => {
  it("미선택 획득 뱃지를 누르면 다음 랭크로 선택된다 (AC 3)", () => {
    const next = toggleFeatured([5], badge({ badgeId: 7 }));

    expect(next).toEqual([5, 7]);
    expect(featuredRankOf(next, 7)).toBe(2);
  });

  it("선택된 뱃지를 다시 누르면 해제된다 (AC 3)", () => {
    expect(toggleFeatured([5, 7], badge({ badgeId: 7 }))).toEqual([5]);
  });

  it("rank 1을 해제하면 잔여 선택이 rank 1로 승격된다 (AC 3)", () => {
    const next = toggleFeatured([5, 7], badge({ badgeId: 5 }));

    expect(next).toEqual([7]);
    expect(featuredRankOf(next, 7)).toBe(1);
  });

  it("미획득 뱃지 클릭은 무시된다 — 선택 상태 불변 (AC 3)", () => {
    const selection = [5];

    expect(
      toggleFeatured(selection, badge({ badgeId: 9, earned: false })),
    ).toBe(selection);
  });

  it("2개 찬 상태에서 새 뱃지를 누르면 먼저 누른 것이 빠진다 (MSG-451 AC 22)", () => {
    const next = toggleFeatured([5, 7], badge({ badgeId: 9 }));

    expect(next).toEqual([7, 9]);
  });

  it("FIFO 교체 후 잔여 선택이 rank 1로 승격된다 (MSG-451 AC 22)", () => {
    const next = toggleFeatured([5, 7], badge({ badgeId: 9 }));

    expect(featuredRankOf(next, 7)).toBe(1);
    expect(featuredRankOf(next, 9)).toBe(2);
    expect(featuredRankOf(next, 5)).toBeNull();
  });

  it("교체를 반복하면 항상 가장 오래된 선택부터 빠진다 (MSG-451 AC 22)", () => {
    const once = toggleFeatured([5, 7], badge({ badgeId: 9 }));

    expect(toggleFeatured(once, badge({ badgeId: 11 }))).toEqual([9, 11]);
  });
});

describe("featuredRankOf — 선택 배열에서 랭크 조회 (AC 2)", () => {
  it("선택 순서가 랭크(1·2)가 되고 미선택은 null이다", () => {
    expect(featuredRankOf([5, 7], 5)).toBe(1);
    expect(featuredRankOf([5, 7], 7)).toBe(2);
    expect(featuredRankOf([5, 7], 9)).toBeNull();
  });
});
