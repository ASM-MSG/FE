import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "../../../test/envelope-response";

/**
 * 기준 20·26 재작업: 확보한 좌표가 **실제 역지오코딩 요청에 실리고**, 응답의 regionName이
 * 위치 라벨이 되는지를 고정한다. 이전에는 좌표 조립(confirm-input)만 단정해 "좌표가 어디서
 * 와서 어디로 가는가"가 비어 있었다(검증 지적 3).
 *
 * 좌표 출처(`resolveMapCenter()`)는 expo-location 어댑터라 여기서 호출하지 않는다 —
 * 그 총함수 계약은 `shared/geolocation.test.ts`가, 실제 배선은 실기가 덮는다.
 * 훅(`use-upload-location.ts`)이 아니라 조회 옵션 모듈을 보는 이유: 훅 파일은 expo-location을
 * 끌고 와 vitest에서 import 자체가 불가능하고, 모바일에는 훅 렌더 테스트 인프라도 없다
 * (`vitest.config.ts`, MSG-292 확정 4).
 */
const API_BASE = "https://api.test.local";

type LocationModule = typeof import("./upload-location-query");
let uploadLocationQueryOptions: LocationModule["uploadLocationQueryOptions"];

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  ({ uploadLocationQueryOptions } = await import("./upload-location-query"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** 생성 queryFn이 받는 컨텍스트의 최소 형태 — queryKey·signal만 쓴다 */
const runQuery = async (
  options: ReturnType<typeof uploadLocationQueryOptions>,
) =>
  // eslint 대상 아님: 생성 타입의 컨텍스트 전체를 만들 필요가 없어 필요한 두 필드만 넘긴다
  (
    options.queryFn as (context: {
      queryKey: unknown;
      signal: AbortSignal;
    }) => Promise<unknown>
  )({
    queryKey: options.queryKey,
    signal: new AbortController().signal,
  });

describe("uploadLocationQueryOptions — 업로드 위치 조회 (기준 20·26)", () => {
  it("확보한 좌표가 역지오코딩 요청의 질의로 나간다 (기준 26)", async () => {
    const requested: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        requested.push(request.url);
        return envelopeResponse({ regionName: "부산진구 부전2동" });
      }),
    );

    // 서면 폴백 상수(35.1579/129.0594)가 아닌 좌표를 쓴다 — 폴백 값으로 하드코딩하는
    // 변이도 잡혀야 "확보한 좌표가 실린다"를 실제로 고정한다(2차 검증 R7 잔여 사각)
    await runQuery(uploadLocationQueryOptions({ lat: 37.5665, lng: 126.978 }));

    const url = new URL(requested[0]);
    expect(url.pathname).toBe("/api/regions/reverse-geocode");
    expect(url.searchParams.get("lat")).toBe("37.5665");
    expect(url.searchParams.get("lng")).toBe("126.978");
  });

  it("응답의 regionName이 위치 라벨이 된다 — mock 상수가 아니다 (기준 20)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelopeResponse({ regionName: "부산진구 부전2동" })),
    );
    const options = uploadLocationQueryOptions({ lat: 35.1579, lng: 129.0594 });

    const data = await runQuery(options);

    expect(options.select(data as never)).toEqual({
      regionName: "부산진구 부전2동",
    });
  });

  it("좌표 확보 전에는 조회하지 않는다 — 0,0 좌표로 헛조회하지 않게 (기준 20)", () => {
    expect(uploadLocationQueryOptions(null).enabled).toBe(false);
    expect(
      uploadLocationQueryOptions({ lat: 35.1579, lng: 129.0594 }).enabled,
    ).toBe(true);
  });
});
