import { describe, expect, it } from "vitest";
import {
  MAP_QUERY_STALE_TIME,
  entityQueryPolicy,
  mapQueryPolicy,
} from "./map-query-policy";

/**
 * 지도 계열 쿼리 정책의 웹 원본 동등성 (MSG-423 추가 포팅) — 모바일 전역 staleTime은
 * 30초라 지도 계열에 그대로 쓸 수 없어 복제했다. 값이 웹과 갈라지면 같은 API를 두 앱이
 * 다른 신선도로 보게 되므로 드리프트를 여기서 잡는다.
 * 웹 원본은 변수 경로 동적 import (grid.parity.test.ts 선례).
 */
const WEB_POLICY_PATH = new URL(
  "../../../../../web/src/features/map-home/model/map-query-policy.ts",
  import.meta.url,
).pathname;

interface WebPolicy {
  MAP_QUERY_STALE_TIME: number;
  mapQueryPolicy: { staleTime: number; placeholderData: unknown };
  entityQueryPolicy: { staleTime: number };
}

const loadWebPolicy = (): Promise<WebPolicy> => import(WEB_POLICY_PATH);

describe("map-query-policy 동등성", () => {
  it("지도 쿼리 staleTime이 웹 정본(5초)과 같다", async () => {
    const web = await loadWebPolicy();

    expect(MAP_QUERY_STALE_TIME).toBe(web.MAP_QUERY_STALE_TIME);
    expect(MAP_QUERY_STALE_TIME).toBe(5_000);
  });

  it("mapQueryPolicy는 직전 데이터를 유지하고(keepPreviousData) entityQueryPolicy는 유지하지 않는다", async () => {
    const web = await loadWebPolicy();

    expect(mapQueryPolicy.staleTime).toBe(web.mapQueryPolicy.staleTime);
    expect(mapQueryPolicy.placeholderData).toBeTypeOf("function");
    expect(entityQueryPolicy.staleTime).toBe(web.entityQueryPolicy.staleTime);
    expect("placeholderData" in entityQueryPolicy).toBe(false);
    expect("placeholderData" in web.entityQueryPolicy).toBe(false);
  });
});
