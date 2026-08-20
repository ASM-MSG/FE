import { describe, expect, it } from "vitest";
import type { DexBadge } from "../../../entities/dex/model/dex";
import { dexBadge } from "../../../test/dex-badge";
import {
  BADGE_PREVIEW_LIMIT,
  featuredBadgesOf,
  orderBadges,
} from "./badge-showcase";

/**
 * L1·L2 parity: 모바일 `badge-showcase` ↔ 웹 `features/dex/model/badge-showcase.ts`.
 * 웹 원본은 변수 경로 동적 import로 로드한다 — 웹 파일이 이동·삭제되면 이 테스트가 깨진다
 * (의도된 드리프트 감지, dex-summary.parity.test.ts 관례).
 */
interface WebBadgeShowcaseModule {
  BADGE_PREVIEW_LIMIT: typeof BADGE_PREVIEW_LIMIT;
  orderBadges: typeof orderBadges;
  featuredBadgesOf: typeof featuredBadgesOf;
}

const WEB_PATH = new URL(
  "../../../../../web/src/features/dex/model/badge-showcase.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<WebBadgeShowcaseModule> => import(WEB_PATH);

const FIXTURE: DexBadge[] = [
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

describe("badge-showcase 동등성 (L1·L2)", () => {
  it("orderBadges가 같은 카탈로그에서 웹 원본과 같은 순서를 낸다", async () => {
    const web = await loadWeb();
    expect(orderBadges(FIXTURE)).toEqual(web.orderBadges(FIXTURE));
    expect(orderBadges([])).toEqual(web.orderBadges([]));
  });

  it("featuredBadgesOf가 웹 원본과 같은 대표 목록을 낸다", async () => {
    const web = await loadWeb();
    expect(featuredBadgesOf(FIXTURE)).toEqual(web.featuredBadgesOf(FIXTURE));
    expect(featuredBadgesOf([])).toEqual(web.featuredBadgesOf([]));
  });

  it("BADGE_PREVIEW_LIMIT이 웹 원본과 같다", async () => {
    const web = await loadWeb();
    expect(BADGE_PREVIEW_LIMIT).toBe(web.BADGE_PREVIEW_LIMIT);
  });
});
