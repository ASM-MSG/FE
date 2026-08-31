import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { envelopeResponse } from "@/test/envelope-response";
import {
  exceedsEventViewportSpan,
  useEventOccurrencesQuery,
} from "./use-event-occurrences-query";

const bounds = (latSpan: number, lngSpan: number): Bounds => ({
  sw: { lat: 35.1, lng: 129.0 },
  ne: { lat: 35.1 + latSpan, lng: 129.0 + lngSpan },
});

const CHIP_DTO = {
  occurrenceId: 1,
  title: "부산 불꽃축제",
  cityName: "부산",
  startsAt: "2026-09-07T19:30:00",
  endsAt: "2026-09-07T21:00:00",
  status: "UPCOMING",
};

// 테스트마다 새 QueryClient + retry: false (에러 시나리오 타임아웃 방지)
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("exceedsEventViewportSpan — bbox 한 변 0.5도 상한 게이트 (AC 7)", () => {
  it("위도·경도 어느 한 변이라도 0.5도를 넘으면 초과다", () => {
    expect(exceedsEventViewportSpan(bounds(0.6, 0.1))).toBe(true);
    expect(exceedsEventViewportSpan(bounds(0.1, 0.6))).toBe(true);
  });

  it("정확히 0.5도까지는 허용이다 (경계 — 서버 상한은 '초과' 시 400)", () => {
    expect(exceedsEventViewportSpan(bounds(0.5, 0.5))).toBe(false);
    expect(exceedsEventViewportSpan(bounds(0.1, 0.1))).toBe(false);
  });
});

describe("useEventOccurrencesQuery — 뷰포트 행사 회차 조회 (AC 7·8)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("뷰포트 bbox로 조회해 칩 목록을 서버 순서 그대로 준다 — 익명도 발사한다 (AC 7)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        envelopeResponse([CHIP_DTO, { ...CHIP_DTO, occurrenceId: 2 }]),
      ),
    );

    const { result } = renderHook(
      () => useEventOccurrencesQuery(bounds(0.1, 0.1)),
      { wrapper },
    );

    await waitFor(() =>
      expect(result.current.chips.map((c) => c.occurrenceId)).toEqual([1, 2]),
    );
  });

  it("빈 범위(빈 배열)면 칩이 없다 (AC 8)", async () => {
    const fetchSpy = vi.fn(async () => envelopeResponse([]));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(
      () => useEventOccurrencesQuery(bounds(0.1, 0.1)),
      { wrapper },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(result.current.chips).toEqual([]);
  });

  it("조회가 실패하면 칩 없음으로 떨어진다 — 캡슐 미렌더의 근거 (AC 8)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );

    const { result } = renderHook(
      () => useEventOccurrencesQuery(bounds(0.1, 0.1)),
      { wrapper },
    );

    // 실패 확정까지 대기 — pending 동안의 빈 배열과 구분한다
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    await waitFor(() => expect(result.current.chips).toEqual([]));
  });

  it("bbox 한 변이 0.5도를 넘으면(저줌) 요청을 보내지 않는다 — 13401 예방 (AC 7)", async () => {
    const fetchSpy = vi.fn(async () => envelopeResponse([CHIP_DTO]));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(
      () => useEventOccurrencesQuery(bounds(0.6, 0.6)),
      { wrapper },
    );

    // 디바운스·마이크로태스크가 소화될 시간을 주고도 미발사여야 한다
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.chips).toEqual([]);
  });

  it("뷰포트가 바뀌면 이전 bbox 결과를 유지하지 않는다 — 시 경계 이동 시 새 지역명 옆에 이전 시 행사가 남는 짝 어긋남 방지 (codex 리뷰 P2)", async () => {
    let resolveSecond: (response: Response) => void = () => {};
    const fetchSpy = vi
      .fn<() => Promise<Response>>()
      .mockImplementationOnce(async () => envelopeResponse([CHIP_DTO]))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const { result, rerender } = renderHook(
      ({ b }: { b: Bounds }) => useEventOccurrencesQuery(b),
      { wrapper, initialProps: { b: bounds(0.1, 0.1) } },
    );
    await waitFor(() => expect(result.current.chips).toHaveLength(1));

    // 다른 시로 이동 (bbox 교체) → 새 요청 pending 동안 이전 결과가 비어야 한다
    rerender({
      b: { sw: { lat: 35.2, lng: 128.6 }, ne: { lat: 35.3, lng: 128.7 } },
    });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2), {
      timeout: 2_000,
    });
    expect(result.current.chips).toEqual([]);

    resolveSecond(envelopeResponse([]));
  });

  it("뷰포트 미준비(null)면 조회하지 않는다 (경계)", async () => {
    const fetchSpy = vi.fn(async () => envelopeResponse([CHIP_DTO]));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useEventOccurrencesQuery(null), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.chips).toEqual([]);
  });
});
