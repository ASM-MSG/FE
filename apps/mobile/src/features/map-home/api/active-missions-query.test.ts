import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";

/**
 * MSG-579: 활성 미션 조회 옵션의 직전 데이터 유지 규칙.
 * 훅이 아니라 옵션 팩토리를 보는 이유는 grid-aggregation-query.test.ts와 같다 —
 * 훅은 `auth-session`(expo-secure-store)을 끌고 와 vitest에서 열 수 없다.
 */
const API_BASE = "https://api.test.local";

type QueryModule = typeof import("./active-missions-query");
let activeMissionsQueryOptions: QueryModule["activeMissionsQueryOptions"];

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  ({ activeMissionsQueryOptions } = await import("./active-missions-query"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** 서면 근방 — 0.5° 상한 안 (조회 활성) */
const SEOMYEON: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.17, lng: 129.07 },
};
/** 부산 전역 — 한 변 0.5° 초과 (조회 비활성, 서버 400/12401 구간) */
const WIDE: Bounds = {
  sw: { lat: 35.0, lng: 128.8 },
  ne: { lat: 35.4, lng: 129.4 },
};

const previousQueryWithType = (type: string) =>
  ({ queryKey: [{ query: { type } }] }) as never;
const previous = { developCode: 0, message: "ok", data: [] } as never;

describe("activeMissionsQueryOptions — 직전 데이터 유지", () => {
  it("같은 칩(type)의 bbox 이동 중에는 이전 목록을 유지한다 — 깜빡임 방지", () => {
    const options = activeMissionsQueryOptions("route", SEOMYEON, true);

    expect(
      options.placeholderData(previous, previousQueryWithType("COURSE")),
    ).toBe(previous);
  });

  it("칩이 바뀌면 비운다 — 지역축제 목록이 경로추천 카드로 그려지지 않는다", () => {
    const options = activeMissionsQueryOptions("route", SEOMYEON, true);

    expect(
      options.placeholderData(previous, previousQueryWithType("EVENT")),
    ).toBeUndefined();
    expect(options.placeholderData(previous, undefined)).toBeUndefined();
  });

  it("bbox가 0.5°를 넘어 조회가 비활성이면 같은 칩이라도 비운다 — 비활성 쿼리는 응답이 없어 placeholder가 영원히 남는다", () => {
    const options = activeMissionsQueryOptions("route", WIDE, true);

    expect(options.enabled).toBe(false);
    expect(
      options.placeholderData(previous, previousQueryWithType("COURSE")),
    ).toBeUndefined();
  });

  it("비로그인이면 bbox·칩이 열려 있어도 비운다 — 세션 만료 직후 직전 목록 잔존 방지 (PR #147 리뷰)", () => {
    const options = activeMissionsQueryOptions("route", SEOMYEON, false);

    expect(options.enabled).toBe(false);
    expect(
      options.placeholderData(previous, previousQueryWithType("COURSE")),
    ).toBeUndefined();
  });

  it("쿼리 키에 type과 bbox가 실린다", () => {
    const options = activeMissionsQueryOptions("festival", SEOMYEON, true);

    expect(options.enabled).toBe(true);
    expect(options.queryKey[0].query).toEqual({
      type: "EVENT",
      swLat: 35.15,
      swLng: 129.05,
      neLat: 35.17,
      neLng: 129.07,
    });
  });
});
