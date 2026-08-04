import { describe, expect, it } from "vitest";
import { MOCK_RECENT_VISITS, selectRegions } from "./regions";

/**
 * AC 3·9: 모바일 regions ↔ 웹 원본 동등성 (스펙 구현 계획 — 복제 + 동등성 테스트).
 * center 좌표는 지도 이동(AC 3·10)용 모바일 확장이라 parity 대상은 name·count 구성만
 * (스펙 구현 계획 명시). 웹 원본은 변수 경로 동적 import(grid.parity 선례).
 */
interface WebRegionsModule {
  selectRegions: () => { name: string; count: number }[];
  MOCK_RECENT_VISITS: string[];
}
const WEB_REGIONS_PATH = new URL(
  "../../../../../web/src/entities/region/model/regions.ts",
  import.meta.url,
).pathname;
const loadWebRegions = (): Promise<WebRegionsModule> =>
  import(WEB_REGIONS_PATH);

describe("regions 동등성 (AC 3·9)", () => {
  it("전체 지역 8개 구의 name·count 구성과 순서가 웹 원본과 동일하다 (AC 9)", async () => {
    const webRegions = await loadWebRegions();
    const nameCountOnly = selectRegions().map(({ name, count }) => ({
      name,
      count,
    }));
    expect(nameCountOnly).toHaveLength(8);
    expect(nameCountOnly).toEqual(webRegions.selectRegions());
  });

  it("최근 방문 목데이터가 부산진구·수영구·남구이고 웹 원본과 동일하다 (AC 3)", async () => {
    const webRegions = await loadWebRegions();
    expect(MOCK_RECENT_VISITS).toEqual(["부산진구", "수영구", "남구"]);
    expect(MOCK_RECENT_VISITS).toEqual(webRegions.MOCK_RECENT_VISITS);
  });

  it("모든 구에 지도 이동용 center 좌표(목값)가 있고 부산 영역 안이다 (AC 3·10 — 모바일 확장)", () => {
    for (const region of selectRegions()) {
      expect(region.center.lat).toBeGreaterThan(34.9);
      expect(region.center.lat).toBeLessThan(35.4);
      expect(region.center.lng).toBeGreaterThan(128.7);
      expect(region.center.lng).toBeLessThan(129.3);
    }
  });
});
