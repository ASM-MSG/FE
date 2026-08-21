import { describe, expect, it } from "vitest";
import type { DexBadge } from "../../../entities/dex/model/dex";
import { dexBadge } from "../../../test/dex-badge";
import {
  MAX_FEATURED,
  featuredRankOf,
  initialFeaturedSelection,
  toggleFeatured,
} from "./featured-selection";

/**
 * L3 parity: 모바일 `featured-selection` ↔ 웹 `features/dex/model/featured-selection.ts`.
 * 대표 뱃지 선택 규칙은 서버 계약(최대 2 · 배열 순서 = 랭크)이라 두 앱이 갈라지면
 * 같은 PUT이 다른 결과를 만든다 — 드리프트를 이 테스트가 먼저 알린다.
 */
interface WebFeaturedSelectionModule {
  MAX_FEATURED: typeof MAX_FEATURED;
  initialFeaturedSelection: typeof initialFeaturedSelection;
  toggleFeatured: typeof toggleFeatured;
  featuredRankOf: typeof featuredRankOf;
}

const WEB_PATH = new URL(
  "../../../../../web/src/features/dex/model/featured-selection.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<WebFeaturedSelectionModule> => import(WEB_PATH);

const CATALOG: DexBadge[] = [
  dexBadge({ badgeId: 1, earned: true, featuredRank: 2 }),
  dexBadge({ badgeId: 2, earned: true, featuredRank: 1 }),
  dexBadge({ badgeId: 3, earned: true }),
  dexBadge({ badgeId: 9 }),
];

describe("featured-selection 동등성 (L3)", () => {
  it("initialFeaturedSelection이 웹 원본과 같다", async () => {
    const web = await loadWeb();
    expect(initialFeaturedSelection(CATALOG)).toEqual(
      web.initialFeaturedSelection(CATALOG),
    );
    expect(initialFeaturedSelection([])).toEqual(
      web.initialFeaturedSelection([]),
    );
  });

  it("toggleFeatured가 4개 경계 케이스에서 웹 원본과 같다", async () => {
    const web = await loadWeb();
    const cases: [number[], DexBadge][] = [
      [[], CATALOG[3]],
      [[1, 2], CATALOG[2]],
      [[], CATALOG[2]],
      [[1, 2], CATALOG[0]],
    ];
    for (const [selection, target] of cases) {
      expect(toggleFeatured(selection, target)).toEqual(
        web.toggleFeatured(selection, target),
      );
    }
  });

  it("featuredRankOf가 웹 원본과 같다", async () => {
    const web = await loadWeb();
    for (const id of [1, 2, 9]) {
      expect(featuredRankOf([2, 1], id)).toBe(web.featuredRankOf([2, 1], id));
    }
  });

  it("MAX_FEATURED가 웹 원본과 같다", async () => {
    const web = await loadWeb();
    expect(MAX_FEATURED).toBe(web.MAX_FEATURED);
  });
});
