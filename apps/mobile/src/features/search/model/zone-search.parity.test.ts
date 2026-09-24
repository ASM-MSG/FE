import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ZoneResponseDto } from "../../../shared/api/sdk";
import { SEOMYEON_ZONE as SEOMYEON } from "../../../test/zone-fixture";
import * as mobile from "./zone-search";

/**
 * L1: 모바일 `zone-search` ↔ 웹 원본(`features/search/model/zone-search.ts`) 동등성
 * (MSG-578 D5 — `format.parity`·`explore-regions-query.parity` 선례). 5 함수가 같은
 * 입력에 같은 출력을 내야 검색 라벨·역산 격자가 두 앱에서 같은 격자를 가리킨다.
 * 웹 파일이 이동하면 이 테스트가 깨진다 — 의도된 드리프트 감지.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/search/model/zone-search.ts",
  import.meta.url,
).pathname;

// 웹 원본의 import 체인(grid-overlay → …)이 생성 쿼리 옵션(→ client-config)에 닿을 수
// 있어 baseUrl 부트 가드를 선행한다 (explore-regions-query.parity 관례)
beforeAll(() => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
});
afterAll(() => {
  vi.unstubAllEnvs();
});

type ZoneSearchModule = Pick<
  typeof mobile,
  | "parseGridQuery"
  | "matchZones"
  | "zoneCellToGridId"
  | "zoneBounds"
  | "deriveGridSearchResults"
>;
const loadWeb = (): Promise<ZoneSearchModule> => import(WEB_PATH);

const MARKET: ZoneResponseDto = {
  ...SEOMYEON,
  zoneKey: "seomyeon-market",
  name: "서면시장",
  priority: 0,
};
const DONG: ZoneResponseDto = {
  ...SEOMYEON,
  zoneKey: "dong-seomyeon",
  name: "동서면",
  priority: 2,
};
const ZONES = [SEOMYEON, MARKET, DONG];

const QUERIES = ["서면 A-14", "서면 a-1", "서면 A", "서면", "   ", "서면 Z-99"];

describe("zone-search 웹 원본 동등성 (L1)", () => {
  it("parseGridQuery — 같은 입력에 같은 분해", async () => {
    const web = await loadWeb();

    for (const q of QUERIES) {
      expect(mobile.parseGridQuery(q)).toEqual(web.parseGridQuery(q));
    }
  });

  it("matchZones — 접두>포함, priority·zoneKey 정렬이 같다", async () => {
    const web = await loadWeb();

    for (const term of ["서면", "면", "동", ""]) {
      expect(mobile.matchZones(ZONES, term)).toEqual(
        web.matchZones(ZONES, term),
      );
    }
  });

  it("zoneCellToGridId — 안·밖 칸 코드 역산이 같다", async () => {
    const web = await loadWeb();

    for (const [row, col] of [
      ["A", 1],
      ["B", 3],
      ["D", 6],
      ["E", 1],
      ["A", 7],
      ["A", 0],
    ] as const) {
      expect(mobile.zoneCellToGridId(SEOMYEON, row, col)).toBe(
        web.zoneCellToGridId(SEOMYEON, row, col),
      );
    }
  });

  it("zoneBounds — 모서리 4점 min/max bounds가 같다", async () => {
    const web = await loadWeb();

    expect(mobile.zoneBounds(SEOMYEON)).toEqual(web.zoneBounds(SEOMYEON));
  });

  it("deriveGridSearchResults — 격자·구역 결과 목록이 같다", async () => {
    const web = await loadWeb();

    for (const q of QUERIES) {
      expect(mobile.deriveGridSearchResults(ZONES, q)).toEqual(
        web.deriveGridSearchResults(ZONES, q),
      );
    }
  });
});
