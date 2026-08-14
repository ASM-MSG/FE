import { describe, expect, it } from "vitest";
import { MOCK_RECENT_VISITS, selectRegions } from "./regions";

/**
 * 모바일 regions 목데이터 검증 — 원래 웹 원본과의 parity 테스트였으나, 웹의
 * entities/region/model/regions.ts가 탐색 제거(MSG-328)로 삭제돼 모바일이 이
 * 목데이터의 단독 소유가 됐다. 웹 비교 단정만 걷어내고 값 계약은 그대로 고정한다.
 */
describe("regions 목데이터 (구 웹 parity — MSG-328부터 모바일 단독)", () => {
  it("전체 지역은 8개 구다 (AC 9)", () => {
    expect(selectRegions()).toHaveLength(8);
  });

  it("최근 방문 목데이터는 부산진구·수영구·남구다 (AC 3)", () => {
    expect(MOCK_RECENT_VISITS).toEqual(["부산진구", "수영구", "남구"]);
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
