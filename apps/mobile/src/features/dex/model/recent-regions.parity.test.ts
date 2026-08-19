import { describe, expect, it } from "vitest";
import type {
  CollectedGrid,
  RecentRegion,
} from "../../../entities/dex/model/dex";
import { deriveRecentRegions, excludeRemovedRegions } from "./recent-regions";

/**
 * L1·L2·L4 parity: 모바일 `recent-regions` ↔ 웹 `features/dex/model/recent-regions.ts`
 * 동등성 (스펙 "추가 parity" — 웹 원본에 `RN 재사용 대상` 주석이 있고 요구 ③④의 핵심
 * 파생이라 드리프트 감지가 필요하다). `limitRecentRegions`는 모바일 고유라 대상 밖이다.
 * 웹 파일이 이동·삭제되면 이 테스트가 깨진다(의도된 드리프트 감지).
 */
interface WebRecentRegionsModule {
  deriveRecentRegions: (grids: CollectedGrid[]) => RecentRegion[];
  excludeRemovedRegions: (
    regions: RecentRegion[],
    removedRegionNames: string[],
  ) => RecentRegion[];
}

const WEB_RECENT_REGIONS_PATH = new URL(
  "../../../../../web/src/features/dex/model/recent-regions.ts",
  import.meta.url,
).pathname;

const loadWebRecentRegions = (): Promise<WebRecentRegionsModule> =>
  import(WEB_RECENT_REGIONS_PATH);

/** 픽스처 — 동 3개(동률 정렬 1쌍 포함) + regionName null 1건 + 동별 다중 격자 */
const GRIDS: CollectedGrid[] = [
  {
    gridId: "39064_112221",
    gridY: 39064,
    gridX: 112221,
    lastUploadedAt: "2026-08-19T09:00:00+09:00",
    videoCount: 3,
    regionName: "부산광역시 부산진구 부전2동",
    zoneName: "서면",
    zoneCell: "A-14",
  },
  {
    gridId: "39064_112222",
    gridY: 39064,
    gridX: 112222,
    lastUploadedAt: "2026-08-19T11:00:00+09:00",
    videoCount: 2,
    regionName: "부산광역시 부산진구 부전2동",
    zoneName: "서면",
    zoneCell: "A-15",
  },
  {
    gridId: "39065_112221",
    gridY: 39065,
    gridX: 112221,
    lastUploadedAt: "2026-08-17T08:00:00+09:00",
    videoCount: 1,
    regionName: "부산광역시 부산진구 전포1동",
    zoneName: null,
    zoneCell: null,
  },
  {
    gridId: "39066_112221",
    gridY: 39066,
    gridX: 112221,
    lastUploadedAt: "2026-08-17T08:00:00+09:00",
    videoCount: 4,
    regionName: "부산광역시 부산진구 가야1동",
    zoneName: null,
    zoneCell: null,
  },
  {
    gridId: "39067_112221",
    gridY: 39067,
    gridX: 112221,
    lastUploadedAt: "2026-08-20T08:00:00+09:00",
    videoCount: 9,
    regionName: null,
    zoneName: null,
    zoneCell: null,
  },
];

describe("recent-regions 동등성 (L1·L2·L4)", () => {
  it("deriveRecentRegions 결과가 웹 원본과 전체 배열 단위로 동일하다 (L1·L2)", async () => {
    const web = await loadWebRecentRegions();

    expect(deriveRecentRegions(GRIDS)).toEqual(web.deriveRecentRegions(GRIDS));
  });

  it("excludeRemovedRegions 결과가 웹 원본과 동일하다 — 감춤 1건/빈 목록 (L4)", async () => {
    const web = await loadWebRecentRegions();
    const derived = deriveRecentRegions(GRIDS);

    for (const removed of [[], ["부산광역시 부산진구 부전2동"]]) {
      expect(excludeRemovedRegions(derived, removed)).toEqual(
        web.excludeRemovedRegions(derived, removed),
      );
    }
  });
});
