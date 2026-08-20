import { describe, expect, it } from "vitest";
import { dexBadge } from "../../../test/dex-badge";
import {
  MAX_FEATURED,
  featuredRankOf,
  initialFeaturedSelection,
  toggleFeatured,
} from "./featured-selection";

const earned1 = dexBadge({ badgeId: 1, earned: true });
const earned3 = dexBadge({ badgeId: 3, earned: true });
const locked = dexBadge({ badgeId: 9 });

describe("MAX_FEATURED — 대표 뱃지 최대 2개 (L3)", () => {
  it("서버 스키마가 명시한 상한 2다", () => {
    expect(MAX_FEATURED).toBe(2);
  });
});

describe("initialFeaturedSelection — 서버 rank 순 초기 선택 (L3)", () => {
  it("featuredRank 보유분만 rank 오름차순 badgeId 배열로 낸다", () => {
    const catalog = [
      dexBadge({ badgeId: 7, earned: true, featuredRank: 2 }),
      earned1,
      dexBadge({ badgeId: 8, earned: true, featuredRank: 1 }),
    ];
    expect(initialFeaturedSelection(catalog)).toEqual([8, 7]);
  });

  it("대표가 없으면 빈 배열이다 (경계)", () => {
    expect(initialFeaturedSelection([earned1, locked])).toEqual([]);
  });
});

describe("toggleFeatured — 편집 모드 선택 토글 (L3)", () => {
  it("미획득 뱃지를 누르면 선택되지 않는다", () => {
    expect(toggleFeatured([], locked)).toEqual([]);
  });

  it("이미 2개를 고른 상태에서 세 번째를 누르면 선택되지 않는다", () => {
    expect(toggleFeatured([1, 2], earned3)).toEqual([1, 2]);
  });

  it("획득 뱃지를 누르면 선택되고, 다시 누르면 해제된다", () => {
    const selected = toggleFeatured([], earned1);
    expect(selected).toEqual([1]);
    expect(toggleFeatured(selected, earned1)).toEqual([]);
  });

  it("rank 1을 해제하면 잔여 선택이 rank 1로 승격된다", () => {
    const next = toggleFeatured([1, 2], earned1);
    expect(next).toEqual([2]);
    expect(featuredRankOf(next, 2)).toBe(1);
  });
});

describe("featuredRankOf — 선택 순번 조회 (L3)", () => {
  it("선택 배열의 위치가 곧 순번(1·2)이다", () => {
    expect(featuredRankOf([4, 5], 4)).toBe(1);
    expect(featuredRankOf([4, 5], 5)).toBe(2);
  });

  it("미선택이면 null이다", () => {
    expect(featuredRankOf([4, 5], 9)).toBeNull();
  });
});
