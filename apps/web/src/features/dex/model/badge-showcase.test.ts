import { describe, expect, it } from "vitest";
import type { DexBadge } from "@/entities/dex";
import { BADGE_PREVIEW_LIMIT, orderBadges } from "./badge-showcase";

const badge = (over: Partial<DexBadge>): DexBadge => ({
  badgeId: 1,
  code: "EXPLORER_1",
  name: "첫 발자국",
  earned: false,
  iconUrl: null,
  earnedAt: null,
  featuredRank: null,
  ...over,
});

describe("orderBadges — 진열장 표시 순서 (기준 17)", () => {
  it("대표 뱃지가 featuredRank 순으로 맨 앞에 온다", () => {
    const ordered = orderBadges([
      badge({ badgeId: 1, earned: true, earnedAt: "2026-08-12T00:00:00Z" }),
      badge({
        badgeId: 2,
        earned: true,
        earnedAt: "2026-08-01T00:00:00Z",
        featuredRank: 2,
      }),
      badge({
        badgeId: 3,
        earned: true,
        earnedAt: "2026-07-01T00:00:00Z",
        featuredRank: 1,
      }),
    ]);

    expect(ordered.map((b) => b.badgeId)).toEqual([3, 2, 1]);
  });

  it("대표가 아닌 획득 뱃지는 최근 획득순으로 온다", () => {
    const ordered = orderBadges([
      badge({ badgeId: 1, earned: true, earnedAt: "2026-08-01T00:00:00Z" }),
      badge({ badgeId: 2, earned: true, earnedAt: "2026-08-12T00:00:00Z" }),
    ]);

    expect(ordered.map((b) => b.badgeId)).toEqual([2, 1]);
  });

  it("미획득 뱃지는 획득 뱃지 뒤로 밀리되 카탈로그 순서를 유지한다", () => {
    const ordered = orderBadges([
      badge({ badgeId: 1 }),
      badge({ badgeId: 2 }),
      badge({ badgeId: 3, earned: true, earnedAt: "2026-08-01T00:00:00Z" }),
    ]);

    expect(ordered.map((b) => b.badgeId)).toEqual([3, 1, 2]);
  });

  it("획득 0개여도 카탈로그가 그대로 남는다 — 진열장은 비지 않는다 (경계)", () => {
    const ordered = orderBadges([badge({ badgeId: 1 }), badge({ badgeId: 2 })]);

    expect(ordered).toHaveLength(2);
  });

  it("원본 배열을 변형하지 않는다", () => {
    const input = [
      badge({ badgeId: 1 }),
      badge({ badgeId: 2, earned: true, earnedAt: "2026-08-01T00:00:00Z" }),
    ];

    orderBadges(input);

    expect(input.map((b) => b.badgeId)).toEqual([1, 2]);
  });

  it("진열장 프리뷰는 4열 2행 = 8칸이다", () => {
    expect(BADGE_PREVIEW_LIMIT).toBe(8);
  });
});
