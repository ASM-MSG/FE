import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";

/**
 * L11·L12·L13: 집계 조회의 게이트 4축·요청 bbox·직전 데이터 유지 규칙 (MSG-428).
 *
 * 훅(`use-grid-aggregation-query.ts`)이 아니라 옵션 팩토리를 보는 이유: 훅은
 * `auth-session`을 import하는 순간 expo-secure-store가 파싱 단계에 딸려 와 vitest에서
 * import 자체가 불가능하고, 모바일에는 훅 렌더 테스트 인프라도 없다
 * (vitest.config.ts 상단 정책 · MSG-426이 확립한 "옵션 팩토리 + 얇은 훅" 2파일 구조).
 * 게이트 판정·요청 인자 조립·placeholderData는 전부 이 팩토리에 있으므로 계약이 덮인다.
 */
const API_BASE = "https://api.test.local";

type QueryModule = typeof import("./grid-aggregation-query");
let gridAggregationQueryArgs: QueryModule["gridAggregationQueryArgs"];
let gridAggregationQueryOptions: QueryModule["gridAggregationQueryOptions"];
let selectAggregationItems: QueryModule["selectAggregationItems"];
let toClusterMarkers: QueryModule["toClusterMarkers"];

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  ({
    gridAggregationQueryArgs,
    gridAggregationQueryOptions,
    selectAggregationItems,
    toClusterMarkers,
  } = await import("./grid-aggregation-query"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** 서면 근방 통상 뷰포트 — 어느 단위 상한에도 걸리지 않는 크기 */
const SEOMYEON_BOUNDS: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.17, lng: 129.07 },
};

/** 게이트 4축이 전부 열린 기준 입력 — 각 케이스는 여기서 한 축만 닫는다 */
const openGate = {
  bounds: SEOMYEON_BOUNDS,
  zoom: 14,
  isAuthenticated: true,
  hydrated: true,
  themeActive: false,
};

describe("gridAggregationQueryArgs — 게이트 4축 (L11)", () => {
  it("네 축이 모두 열리면 enabled=true이고 unit이 판정된다", () => {
    const args = gridAggregationQueryArgs(openGate);

    expect(args.enabled).toBe(true);
    expect(args.unit).toBe("DONG");
  });

  it("bounds가 null이면 미발사다 — 지도 준비 전", () => {
    expect(
      gridAggregationQueryArgs({ ...openGate, bounds: null }).enabled,
    ).toBe(false);
  });

  it("비로그인이면 미발사다 — 보호 API 401 재발사 방지 (승인 Q5)", () => {
    expect(
      gridAggregationQueryArgs({ ...openGate, isAuthenticated: false }).enabled,
    ).toBe(false);
    // 재수화 전에는 로그인 여부가 미상이라 아직 쏘지 않는다
    expect(
      gridAggregationQueryArgs({ ...openGate, hydrated: false }).enabled,
    ).toBe(false);
  });

  it("zoom이 GRID_MIN_ZOOM 이상이면 미발사다 — 개별 격자 구간", () => {
    const args = gridAggregationQueryArgs({ ...openGate, zoom: 16 });

    expect(args.unit).toBeNull();
    expect(args.enabled).toBe(false);
  });

  it("테마 칩이 활성이면 미발사다 — 칩 화면에 점령 층 없음 (승인 Q4)", () => {
    expect(
      gridAggregationQueryArgs({ ...openGate, themeActive: true }).enabled,
    ).toBe(false);
  });
});

describe("selectAggregationItems — 비활성 반환 (L11)", () => {
  const response = {
    developCode: 0,
    message: "ok",
    data: {
      currentRegion: null,
      items: [
        {
          regionCode: "2623051000",
          name: "부전2동",
          lat: 35.1579,
          lng: 129.0594,
          count: 31,
        },
      ],
    },
  } as unknown as Parameters<typeof selectAggregationItems>[1];

  it("게이트가 닫혀 있으면 항상 같은 빈 배열 참조를 돌려준다 — 마커 useMemo 헛돌기 방지", () => {
    const first = selectAggregationItems(false, response);
    const second = selectAggregationItems(false, undefined);

    expect(first).toEqual([]);
    expect(first).toBe(second);
  });

  it("게이트가 열려 응답이 오면 봉투를 벗긴 items를 돌려준다", () => {
    expect(selectAggregationItems(true, response)).toHaveLength(1);
    expect(selectAggregationItems(true, response)[0].name).toBe("부전2동");
    // 응답 미도착 구간도 빈 배열(같은 참조)이다
    expect(selectAggregationItems(true, undefined)).toEqual([]);
  });
});

describe("gridAggregationQueryArgs — 요청 bbox·unit (L12)", () => {
  it("요청 bbox가 unit 상한으로 클램프된 좌표다 — 상한 초과 뷰포트에서 400(4402)이 나갈 경로가 없다", () => {
    // 구 단위(zoom 12) 상한 4도를 넘는 6도 × 6도 뷰포트
    const wide: Bounds = {
      sw: { lat: 32, lng: 126 },
      ne: { lat: 38, lng: 132 },
    };
    const args = gridAggregationQueryArgs({
      ...openGate,
      bounds: wide,
      zoom: 12,
    });

    expect(args.unit).toBe("SIGUNGU");
    expect(args.query).toEqual({
      swLat: 33,
      swLng: 127,
      neLat: 37,
      neLng: 131,
      unit: "SIGUNGU",
    });
  });

  it("상한 이내 뷰포트는 좌표를 그대로 싣고 unit 문자열을 함께 보낸다", () => {
    expect(gridAggregationQueryArgs(openGate).query).toEqual({
      swLat: 35.15,
      swLng: 129.05,
      neLat: 35.17,
      neLng: 129.07,
      unit: "DONG",
    });
  });

  it("미발사 상태에서도 옵션 타입을 채우되 실제 요청 인자는 만들지 않는다 — enabled=false", () => {
    const args = gridAggregationQueryArgs({ ...openGate, bounds: null });

    expect(args.enabled).toBe(false);
    expect(args.query).toEqual({
      swLat: 0,
      swLng: 0,
      neLat: 0,
      neLng: 0,
      unit: "DONG",
    });
  });
});

describe("gridAggregationQueryOptions — 직전 데이터 유지 (L13)", () => {
  /** 직전 쿼리의 최소 형태 — placeholderData가 읽는 것은 queryKey의 unit뿐이다 */
  const previousQueryWithUnit = (unit: string) =>
    ({ queryKey: [{ query: { unit } }] }) as never;

  it("직전 쿼리 키의 unit이 현재와 같으면 이전 데이터를 유지한다 — 같은 단위 이동 중 깜빡임 방지", () => {
    const options = gridAggregationQueryOptions({ ...openGate, zoom: 14 });
    const previous = { developCode: 0, message: "ok", data: {} } as never;

    expect(
      options.placeholderData(previous, previousQueryWithUnit("DONG")),
    ).toBe(previous);
  });

  it("직전 쿼리 키의 unit이 다르면 비운다 — 동↔구 전환 순간 이전 단위 마커가 남지 않는다", () => {
    const options = gridAggregationQueryOptions({ ...openGate, zoom: 14 });
    const previous = { developCode: 0, message: "ok", data: {} } as never;

    expect(
      options.placeholderData(previous, previousQueryWithUnit("SIGUNGU")),
    ).toBeUndefined();
    expect(options.placeholderData(previous, undefined)).toBeUndefined();
  });

  it("생성 옵션의 쿼리 키에 요청 bbox·unit이 실린다 — 뷰포트가 바뀌면 재조회된다", () => {
    const options = gridAggregationQueryOptions(openGate);

    expect(options.queryKey[0].query).toEqual({
      swLat: 35.15,
      swLng: 129.05,
      neLat: 35.17,
      neLng: 129.07,
      unit: "DONG",
    });
  });
});

describe("toClusterMarkers — 마커 파생 합성", () => {
  /** 부산 표본 — 임계(동 68px)보다 훨씬 멀어 zoom 14에서는 병합되지 않는다 */
  const ITEMS = [
    {
      regionCode: "2623051000",
      name: "부전2동",
      lat: 35.1579,
      lng: 129.0594,
      count: 31,
    },
    {
      regionCode: "2623052000",
      name: "부전1동",
      lat: 35.1731,
      lng: 129.0863,
      count: 12,
    },
  ];

  it("unit이 null이면(개별 격자 줌) 항상 같은 빈 배열을 돌려준다 — 격자 층과 겹치지 않는다", () => {
    expect(toClusterMarkers(ITEMS, null, 16)).toEqual([]);
    expect(toClusterMarkers(ITEMS, null, 16)).toBe(
      toClusterMarkers([], null, 20),
    );
  });

  it("items를 마커로 옮기고 그 줌의 겹침 병합까지 적용한다", () => {
    expect(toClusterMarkers(ITEMS, "DONG", 14)).toHaveLength(2);
    // 축척이 넓어지면(zoom 11) 두 동이 한 마커로 합쳐지고 개수는 합산된다
    const merged = toClusterMarkers(ITEMS, "DONG", 11);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBeNull();
    expect(merged[0].count).toBe(43);
  });
});
