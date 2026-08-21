import { describe, expect, it } from "vitest";
import type { DexBadge } from "../../../entities/dex/model/dex";
import { dexBadge } from "../../../test/dex-badge";
import {
  BADGE_PREVIEW_LIMIT,
  featuredBadgesOf,
  orderBadges,
} from "./badge-showcase";

/** 부산 서면 도감 사용자의 뱃지 카탈로그 — 대표 2 · 획득 2 · 미획득 2 */
const CATALOG: DexBadge[] = [
  dexBadge({
    badgeId: 1,
    name: "첫 발자국",
    earned: true,
    earnedAt: "2026-05-01T00:00:00Z",
  }),
  dexBadge({
    badgeId: 2,
    name: "탐험가 I",
    earned: true,
    earnedAt: "2026-08-10T00:00:00Z",
    featuredRank: 2,
  }),
  dexBadge({ badgeId: 3, name: "한 달 개근" }),
  dexBadge({
    badgeId: 4,
    name: "꾸준함의 시작",
    earned: true,
    earnedAt: "2026-08-01T00:00:00Z",
    featuredRank: 1,
  }),
  dexBadge({ badgeId: 5, name: "기록러 I", earned: true, earnedAt: null }),
  dexBadge({ badgeId: 6, name: "축제 입문" }),
];

describe("orderBadges — 진열장 표시 순서 (L1)", () => {
  it("대표(featuredRank 1·2 오름차순) → 그 외 획득(earnedAt 내림차순) → 미획득(정의 순서)로 정렬한다", () => {
    expect(orderBadges(CATALOG).map((b) => b.badgeId)).toEqual([
      4, 2, 1, 5, 3, 6,
    ]);
  });

  it("earnedAt이 없는 획득 뱃지는 획득 그룹의 뒤로 간다", () => {
    const ordered = orderBadges(CATALOG).map((b) => b.badgeId);
    expect(ordered.indexOf(5)).toBeGreaterThan(ordered.indexOf(1));
  });

  it("입력 배열을 변형하지 않는다 (원본 순서 보존)", () => {
    const input = [...CATALOG];
    orderBadges(input);
    expect(input.map((b) => b.badgeId)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("빈 카탈로그는 빈 배열이다 (경계)", () => {
    expect(orderBadges([])).toEqual([]);
  });
});

describe("BADGE_PREVIEW_LIMIT — 진열장 기본 프리뷰 8칸 (L1)", () => {
  it("4열 × 2행 = 8이다", () => {
    expect(BADGE_PREVIEW_LIMIT).toBe(8);
  });
});

describe("featuredBadgesOf — 대표 뱃지 파생 (L2)", () => {
  it("featuredRank 보유분만 rank 오름차순 {id,name}[]로 좁힌다", () => {
    expect(featuredBadgesOf(CATALOG)).toEqual([
      { id: 4, name: "꾸준함의 시작" },
      { id: 2, name: "탐험가 I" },
    ]);
  });

  it("대표가 0개면 빈 배열이다", () => {
    expect(
      featuredBadgesOf(CATALOG.filter((b) => b.featuredRank === null)),
    ).toEqual([]);
  });

  it("빈 배열 입력은 빈 배열이다 (경계)", () => {
    expect(featuredBadgesOf([])).toEqual([]);
  });
});
