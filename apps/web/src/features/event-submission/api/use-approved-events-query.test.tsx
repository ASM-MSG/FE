import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import {
  toApprovedEventsQuery,
  useApprovedEventsQuery,
} from "./use-approved-events-query";

// 실패 경로를 단정하므로 재시도 백오프를 끈 로컬 래퍼를 쓴다 (query-wrapper 주석의 예외 경로)
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const eventItem = (occurrenceId: number, name: string, cityName: string) => ({
  occurrenceId,
  name,
  cityName,
  startsAt: "2026-09-12T10:00:00Z",
  endsAt: "2026-09-14T18:00:00Z",
  placeLabel: "벡스코 제1전시장",
});

const CITY_COUNTS = [
  { cityName: "부산광역시", count: 3 },
  { cityName: "서울특별시", count: 1 },
];

/** 서버 계약: totalCount·cityCounts는 필터 무관 고정, events에만 city·name이 적용된다 */
const approvedEventsFetch = () =>
  vi.stubGlobal("fetch", async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const name = searchParams.get("name");
    const all = [
      eventItem(1, "포켓몬 메가페스타 부산", "부산광역시"),
      eventItem(2, "광안리 M 드론쇼", "부산광역시"),
      eventItem(3, "서울 라이트 페스타", "서울특별시"),
    ];
    const events = all
      .filter((item) => city === null || item.cityName === city)
      .filter((item) => name === null || item.name.includes(name));
    return envelopeResponse({ totalCount: 4, cityCounts: CITY_COUNTS, events });
  });

describe("toApprovedEventsQuery — 모달 조회 파라미터 파생 (AC 3·4)", () => {
  it("전체 보기(시 미선택)와 빈 검색어는 파라미터를 싣지 않는다 (AC 3)", () => {
    expect(toApprovedEventsQuery({ city: null, name: "" })).toEqual({});
  });

  it("선택한 시·도는 city로, 검색어는 name으로 실린다 (AC 3·4)", () => {
    expect(
      toApprovedEventsQuery({ city: "부산광역시", name: " 드론 " }),
    ).toEqual({ city: "부산광역시", name: "드론" });
  });
});

describe("useApprovedEventsQuery — 승인 이벤트 후보 조회 (AC 3·4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("모달이 닫혀 있으면 조회하지 않는다 (AC 3)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(
      () => useApprovedEventsQuery({ city: null, name: "", enabled: false }),
      { wrapper },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.events).toEqual([]);
  });

  it("시·도 칩 재료(cityCounts)와 전체 건수를 그대로 노출한다 (AC 3)", async () => {
    approvedEventsFetch();

    const { result } = renderHook(
      () => useApprovedEventsQuery({ city: null, name: "", enabled: true }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.cityCounts).toEqual(CITY_COUNTS);
    expect(result.current.totalCount).toBe(4);
    expect(result.current.events).toHaveLength(3);
  });

  it("시·도를 고르면 그 지역 목록만 남고 건수·칩은 그대로다 (AC 3·4)", async () => {
    approvedEventsFetch();

    const { result } = renderHook(
      () =>
        useApprovedEventsQuery({
          city: "서울특별시",
          name: "",
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.events.map((item) => item.name)).toEqual([
      "서울 라이트 페스타",
    ]);
    expect(result.current.totalCount).toBe(4);
    expect(result.current.cityCounts).toEqual(CITY_COUNTS);
  });

  it("검색어는 name 파라미터로 서버 검색되고 칩·건수는 고정이다 (AC 4)", async () => {
    approvedEventsFetch();

    const { result } = renderHook(
      () => useApprovedEventsQuery({ city: null, name: "드론", enabled: true }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.events.map((item) => item.name)).toEqual([
      "광안리 M 드론쇼",
    ]);
    expect(result.current.cityCounts).toEqual(CITY_COUNTS);
  });

  it("결과가 없는 시·도는 빈 목록이고 실패가 아니다 (AC 4 — 서버 계약)", async () => {
    approvedEventsFetch();

    const { result } = renderHook(
      () =>
        useApprovedEventsQuery({
          city: "대구광역시",
          name: "",
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.events).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it("조회가 실패하면 재시도 가능한 실패 상태가 된다 (AC 4)", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 500 }));

    const { result } = renderHook(
      () => useApprovedEventsQuery({ city: null, name: "", enabled: true }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.events).toEqual([]);
  });
});
