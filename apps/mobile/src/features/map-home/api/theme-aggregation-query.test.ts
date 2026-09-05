import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";

/**
 * L6~L9 (MSG-558 확장): 칩 택일 집계 — 소스 판정·게이트·요청 인자·직전 데이터 유지·마커 합성.
 * 웹 `use-mission-aggregation-query.ts`·`use-hotzone-aggregation-query.ts`(+ 각 `.test.tsx`)의
 * 계약을 옵션 팩토리 단정으로 1:1 옮겼다 — 훅 렌더 테스트 인프라가 없고 훅 파일은
 * `auth-session`이 expo-secure-store를 끌고 와 vitest에서 열리지 않는다
 * (grid-aggregation-query.test.ts와 같은 구조).
 */
const API_BASE = "https://api.test.local";

type QueryModule = typeof import("./theme-aggregation-query");
let clusterSourceForTheme: QueryModule["clusterSourceForTheme"];
let missionAggregationQueryArgs: QueryModule["missionAggregationQueryArgs"];
let hotZoneAggregationQueryArgs: QueryModule["hotZoneAggregationQueryArgs"];
let missionAggregationQueryOptions: QueryModule["missionAggregationQueryOptions"];
let hotZoneAggregationQueryOptions: QueryModule["hotZoneAggregationQueryOptions"];
let selectThemeClusters: QueryModule["selectThemeClusters"];

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  ({
    clusterSourceForTheme,
    missionAggregationQueryArgs,
    hotZoneAggregationQueryArgs,
    missionAggregationQueryOptions,
    hotZoneAggregationQueryOptions,
    selectThemeClusters,
  } = await import("./theme-aggregation-query"));
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
const SEOMYEON_BBOX = {
  swLat: 35.15,
  swLng: 129.05,
  neLat: 35.17,
  neLng: 129.07,
};

/** 축제 칩 + 동 단 + 뷰포트 — 미션 게이트가 열린 기준 입력 */
const festivalGate = {
  theme: "festival" as const,
  bounds: SEOMYEON_BOUNDS,
  zoom: 14,
};
const hotGate = { theme: "hot" as const, bounds: SEOMYEON_BOUNDS, zoom: 14 };

describe("clusterSourceForTheme — 칩 택일 (L6)", () => {
  it("칩 없음→occupied, 핫→hot, 축제·팝업→mission, 경로→none — 웹 MapShell 택일 분기와 동치", () => {
    expect(clusterSourceForTheme(null)).toBe("occupied");
    expect(clusterSourceForTheme("hot")).toBe("hot");
    expect(clusterSourceForTheme("festival")).toBe("mission");
    expect(clusterSourceForTheme("popup")).toBe("mission");
    expect(clusterSourceForTheme("route")).toBe("none");
  });
});

describe("missionAggregationQueryArgs — 게이트·요청 인자 (L7)", () => {
  it("축제 칩은 type=EVENT, 팝업 칩은 type=POPUP으로 발사한다", () => {
    const festival = missionAggregationQueryArgs(festivalGate);
    const popup = missionAggregationQueryArgs({
      ...festivalGate,
      theme: "popup",
    });

    expect(festival.enabled).toBe(true);
    expect(festival.query).toEqual({
      type: "EVENT",
      unit: "DONG",
      ...SEOMYEON_BBOX,
    });
    expect(popup.enabled).toBe(true);
    expect(popup.query.type).toBe("POPUP");
  });

  it("인증 축이 없다 — 게이트 입력에 로그인 상태 자체가 없다 (C1, MSG-454 익명 허용)", () => {
    expect(Object.keys(festivalGate).sort()).toEqual([
      "bounds",
      "theme",
      "zoom",
    ]);
    expect(missionAggregationQueryArgs(festivalGate).enabled).toBe(true);
  });

  it("1km 축척(zoom 12)이면 unit=SIGUNGU로 발사한다", () => {
    const args = missionAggregationQueryArgs({ ...festivalGate, zoom: 12 });

    expect(args.unit).toBe("SIGUNGU");
    expect(args.query.unit).toBe("SIGUNGU");
  });

  it("격자 줌(zoom ≥ 16)이면 미발사다 — 개별 미션 격자 구간", () => {
    const args = missionAggregationQueryArgs({ ...festivalGate, zoom: 16 });

    expect(args.unit).toBeNull();
    expect(args.enabled).toBe(false);
  });

  it("칩이 없거나 핫·경로 칩이면 미발사다 — 미션 집계는 축제·팝업만", () => {
    for (const theme of [null, "hot", "route"] as const) {
      expect(
        missionAggregationQueryArgs({ ...festivalGate, theme }).enabled,
      ).toBe(false);
    }
  });

  it("뷰포트가 null이면 미발사이고 자리채움 query(0 좌표·EVENT·DONG)를 채운다", () => {
    const args = missionAggregationQueryArgs({ ...festivalGate, bounds: null });

    expect(args.enabled).toBe(false);
    expect(args.query).toEqual({
      type: "EVENT",
      unit: "DONG",
      swLat: 0,
      swLng: 0,
      neLat: 0,
      neLng: 0,
    });
  });

  it("요청 bbox가 unit 상한으로 클램프된다 — 상한 초과 뷰포트에서 400이 나갈 경로가 없다", () => {
    const wide: Bounds = {
      sw: { lat: 32, lng: 126 },
      ne: { lat: 38, lng: 132 },
    };

    const args = missionAggregationQueryArgs({
      ...festivalGate,
      bounds: wide,
      zoom: 12,
    });

    expect(args.query).toEqual({
      type: "EVENT",
      unit: "SIGUNGU",
      swLat: 33,
      swLng: 127,
      neLat: 37,
      neLng: 131,
    });
  });
});

describe("hotZoneAggregationQueryArgs — 게이트·요청 인자 (L7)", () => {
  it("핫 칩 + 동 단 + 뷰포트면 type 없이 unit·bbox만 싣고 발사한다", () => {
    const args = hotZoneAggregationQueryArgs(hotGate);

    expect(args.enabled).toBe(true);
    expect(args.query).toEqual({ unit: "DONG", ...SEOMYEON_BBOX });
    expect("type" in args.query).toBe(false);
  });

  it("핫 칩이 아니면(칩 없음·축제·팝업·경로) 미발사다", () => {
    for (const theme of [null, "festival", "popup", "route"] as const) {
      expect(hotZoneAggregationQueryArgs({ ...hotGate, theme }).enabled).toBe(
        false,
      );
    }
  });

  it("격자 줌·뷰포트 null이면 미발사이고 자리채움 query(0 좌표·DONG)를 채운다", () => {
    expect(hotZoneAggregationQueryArgs({ ...hotGate, zoom: 16 }).enabled).toBe(
      false,
    );
    const args = hotZoneAggregationQueryArgs({ ...hotGate, bounds: null });

    expect(args.enabled).toBe(false);
    expect(args.query).toEqual({
      unit: "DONG",
      swLat: 0,
      swLng: 0,
      neLat: 0,
      neLng: 0,
    });
  });

  it("요청 bbox가 unit 상한으로 클램프된다", () => {
    const wide: Bounds = {
      sw: { lat: 32, lng: 126 },
      ne: { lat: 38, lng: 132 },
    };

    expect(
      hotZoneAggregationQueryArgs({ ...hotGate, bounds: wide, zoom: 12 }).query,
    ).toEqual({
      unit: "SIGUNGU",
      swLat: 33,
      swLng: 127,
      neLat: 37,
      neLng: 131,
    });
  });
});

describe("placeholderData — 직전 데이터 유지 (L8)", () => {
  const previousData = { developCode: 0, message: "ok", data: [] } as never;
  const previousQuery = (query: Record<string, string>) =>
    ({ queryKey: [{ query }] }) as never;

  it("미션은 직전 쿼리의 unit·type이 둘 다 같을 때만 유지한다 — 같은 unit bbox 이동", () => {
    const options = missionAggregationQueryOptions(festivalGate);

    expect(
      options.placeholderData(
        previousData,
        previousQuery({ unit: "DONG", type: "EVENT" }),
      ),
    ).toBe(previousData);
  });

  it("미션은 unit이 바뀌면(동→구) 직전 데이터를 버린다", () => {
    const options = missionAggregationQueryOptions({
      ...festivalGate,
      zoom: 12,
    });

    expect(
      options.placeholderData(
        previousData,
        previousQuery({ unit: "DONG", type: "EVENT" }),
      ),
    ).toBeUndefined();
    expect(options.placeholderData(previousData, undefined)).toBeUndefined();
  });

  it("미션은 칩이 바뀌면(축제→팝업) 같은 unit이어도 직전 데이터를 버린다 — 두 층 동시 노출 없음 (S13)", () => {
    const options = missionAggregationQueryOptions({
      ...festivalGate,
      theme: "popup",
    });

    expect(
      options.placeholderData(
        previousData,
        previousQuery({ unit: "DONG", type: "EVENT" }),
      ),
    ).toBeUndefined();
  });

  it("핫은 unit이 같을 때만 유지한다", () => {
    const options = hotZoneAggregationQueryOptions(hotGate);

    expect(
      options.placeholderData(previousData, previousQuery({ unit: "DONG" })),
    ).toBe(previousData);
    expect(
      options.placeholderData(previousData, previousQuery({ unit: "SIGUNGU" })),
    ).toBeUndefined();
  });

  it("생성 옵션의 쿼리 키에 요청 인자가 실린다 — 뷰포트·칩이 바뀌면 재조회된다", () => {
    expect(
      missionAggregationQueryOptions(festivalGate).queryKey[0].query,
    ).toEqual({
      type: "EVENT",
      unit: "DONG",
      ...SEOMYEON_BBOX,
    });
    expect(hotZoneAggregationQueryOptions(hotGate).queryKey[0].query).toEqual({
      unit: "DONG",
      ...SEOMYEON_BBOX,
    });
  });
});

describe("selectThemeClusters — 마커 합성 (L9)", () => {
  /** 응답 `data`는 배열 직접이다 — 점령 집계의 `{ items }`와 다르다 (C8) */
  const missionData = {
    developCode: 0,
    message: "ok",
    data: [
      {
        regionCode: "2623051000",
        name: "부전2동",
        lat: 35.1579,
        lng: 129.0594,
        count: 3,
        missionIds: [1, 2, 3],
      },
      {
        regionCode: "2623052000",
        name: "부전1동",
        lat: 35.1731,
        lng: 129.0863,
        count: 1,
        missionIds: [4],
      },
    ],
  } as never;
  const hotData = {
    developCode: 0,
    message: "ok",
    data: [
      {
        regionCode: "26230",
        name: "부산진구",
        lat: 35.1626,
        lng: 129.0531,
        count: 9,
        gridIds: [],
      },
    ],
  } as never;

  it("축제·팝업 칩은 미션 응답을 `mission-${theme}` 마커로 만들고 그 줌의 겹침 병합까지 적용한다", () => {
    const festival = selectThemeClusters({
      theme: "festival",
      unit: "DONG",
      zoom: 14,
      missionData,
      hotData,
    });
    const mergedPopup = selectThemeClusters({
      theme: "popup",
      unit: "DONG",
      zoom: 11,
      missionData,
      hotData,
    });

    expect(festival).toHaveLength(2);
    expect(festival[0]).toMatchObject({
      id: "mission-festival-DONG-2623051000",
      theme: "festival",
    });
    // 축척이 넓어지면(zoom 11) 한 마커로 합쳐지고 앵커 테마를 승계한다
    expect(mergedPopup).toHaveLength(1);
    expect(mergedPopup[0]).toMatchObject({ count: 4, theme: "popup" });
  });

  it("핫 칩은 핫 응답을 `hot` 마커로 만든다 — 미션 응답은 보지 않는다", () => {
    const clusters = selectThemeClusters({
      theme: "hot",
      unit: "SIGUNGU",
      zoom: 12,
      missionData,
      hotData,
    });

    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toMatchObject({
      id: "hot-SIGUNGU-26230",
      name: "부산진구",
      theme: "hot",
    });
  });

  it("칩 없음·경로 칩·unit null·응답 미도착이면 항상 같은 빈 배열 참조다 — 마커 useMemo 헛돌기 방지", () => {
    const base = { unit: "DONG" as const, zoom: 14, missionData, hotData };
    const empty = selectThemeClusters({ ...base, theme: null });

    expect(empty).toEqual([]);
    expect(selectThemeClusters({ ...base, theme: "route" })).toBe(empty);
    expect(
      selectThemeClusters({ ...base, theme: "festival", unit: null }),
    ).toBe(empty);
    expect(
      selectThemeClusters({
        ...base,
        theme: "festival",
        missionData: undefined,
      }),
    ).toBe(empty);
    expect(
      selectThemeClusters({ ...base, theme: "hot", hotData: undefined }),
    ).toBe(empty);
  });
});
