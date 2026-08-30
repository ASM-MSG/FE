import type { ReactNode } from "react";
import {
  hashKey,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { queryWrapper } from "@/test/query-wrapper";
import { ROUTE_POINTS, routePointOf } from "@/test/route-points";
import type { ReceivedRequest } from "@/test/stub-fetch";
import { stubFetch } from "@/test/stub-fetch";
import { useWalkPathsQuery, walkPathsQueryKey } from "./use-walk-paths-query";

/** 서면 좌표쌍 — 키 결정성 단정용 (MVP 지역 부산 서면) */
const SEGMENT = {
  startLat: 35.1601,
  startLng: 129.0621,
  endLat: 35.1633,
  endLng: 129.0668,
};

const walkResponse = (resolved: boolean[]) =>
  envelopeResponse({
    segments: resolved.map((isResolved) => ({
      resolved: isResolved,
      path: isResolved ? [{ lat: 35.1601, lng: 129.0621 }] : null,
      distanceMeters: isResolved ? 604 : null,
    })),
  });

/** 수신 요청이 실은 대조군(활성 쿼리)의 것인지 세그먼트 개수로 식별한다 */
const sentSegmentCount = (received: ReceivedRequest) =>
  (received.body as { segments: unknown[] }).segments.length;

/**
 * 재시도 백오프를 0으로 눌러, 재시도가 일어났다면 **에러 확정 전에 요청 수로 잡히게** 한다.
 * 전역 기본(QueryProvider)은 5xx를 2회 더 두드리므로 `retry: false`가 사라지면
 * 이 클라이언트에서 요청이 4회 기록된다 (L15, Q7).
 */
const retryObservableWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  /** 재시도가 모두 소진돼 실패가 **최종 상태**가 된 시점 */
  const settledAsError = () =>
    client.getQueryCache().getAll()[0]?.state.status === "error";
  return { wrapper, settledAsError };
};

describe("walkPathsQueryKey — 세그먼트 좌표가 곧 결과 식별자 (L13)", () => {
  it("좌표가 같은 세그먼트 목록은 같은 키를 만든다 (L13)", () => {
    expect(hashKey(walkPathsQueryKey([SEGMENT]))).toBe(
      hashKey(walkPathsQueryKey([{ ...SEGMENT }])),
    );
  });

  it("좌표가 다른 새 추천 결과는 다른 키를 만든다 — 이전 응답이 화면에 적용되지 않는다 (L13)", () => {
    expect(hashKey(walkPathsQueryKey([SEGMENT]))).not.toBe(
      hashKey(walkPathsQueryKey([{ ...SEGMENT, endLat: 35.17 }])),
    );
  });
});

describe("useWalkPathsQuery — walk-paths 조회 계약 (L14~L16, R6)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("성공하면 봉투를 벗겨 세그먼트 목록을 그대로 반환한다 (L16)", async () => {
    stubFetch(() => walkResponse([true, false]));

    const { result } = renderHook(() => useWalkPathsQuery(ROUTE_POINTS), {
      wrapper: queryWrapper,
    });

    await waitFor(() => expect(result.current.segments).toBeDefined());
    expect(result.current.segments?.map((s) => s.resolved)).toEqual([
      true,
      false,
    ]);
    expect(result.current.segments?.[0].distanceMeters).toBe(604);
  });

  it("지점이 1개 이하라 세그먼트가 없으면 요청이 나가지 않는다 (L14)", async () => {
    const received = stubFetch(() => walkResponse([true, true]));

    // 같은 렌더에 활성 쿼리(대조군)를 함께 띄운다 — 대조군이 응답을 받은 시점이면
    // 비활성 쿼리의 요청도 나갔다면 이미 기록됐을 시점이다 (waitFor 즉시 통과 회피)
    const { result } = renderHook(
      () => ({
        target: useWalkPathsQuery([ROUTE_POINTS[0]]),
        control: useWalkPathsQuery(ROUTE_POINTS),
      }),
      { wrapper: queryWrapper },
    );

    await waitFor(() => expect(result.current.control.segments).toBeDefined());

    expect(received).toHaveLength(1);
    expect(sentSegmentCount(received[0])).toBe(2); // 대조군(지점 3개)의 요청뿐
    expect(result.current.target.segments).toBeUndefined();
  });

  it("좌표가 한국 서비스 범위 밖이면 요청이 나가지 않는다 (L14, Q3)", async () => {
    const received = stubFetch(() => walkResponse([true, true]));
    const outside = [
      ROUTE_POINTS[0],
      routePointOf(2, { lat: 41.2, lng: 129.05 }),
    ];

    const { result } = renderHook(
      () => ({
        target: useWalkPathsQuery(outside),
        control: useWalkPathsQuery(ROUTE_POINTS),
      }),
      { wrapper: queryWrapper },
    );

    await waitFor(() => expect(result.current.control.segments).toBeDefined());

    expect(received).toHaveLength(1);
    expect(sentSegmentCount(received[0])).toBe(2); // 범위 밖 쿼리(세그먼트 1개)는 없다
    expect(result.current.target.segments).toBeUndefined();
  });

  it("400(14402) 실패는 세그먼트 없음으로 조용히 흡수되고 재시도하지 않는다 (L15)", async () => {
    const received = stubFetch(() =>
      errorEnvelope(14402, "세그먼트 좌표가 서비스 범위 밖입니다", 400),
    );
    const { wrapper, settledAsError } = retryObservableWrapper();

    const { result } = renderHook(() => useWalkPathsQuery(ROUTE_POINTS), {
      wrapper,
    });

    // 실패가 최종 상태가 된 뒤에 센다 — 재시도가 켜져 있었다면 그 요청들도 이미 기록됐다
    await waitFor(() => expect(settledAsError()).toBe(true));
    expect(received).toHaveLength(1);
    expect(result.current.segments).toBeUndefined();
  });

  it("503(14504) 실패도 재시도 없이 세그먼트 없음으로 끝난다 (L15, Q7)", async () => {
    const received = stubFetch(() =>
      errorEnvelope(14504, "보행 경로 기능이 꺼져 있습니다", 503),
    );
    const { wrapper, settledAsError } = retryObservableWrapper();

    const { result } = renderHook(() => useWalkPathsQuery(ROUTE_POINTS), {
      wrapper,
    });

    await waitFor(() => expect(settledAsError()).toBe(true));
    expect(received).toHaveLength(1);
    expect(result.current.segments).toBeUndefined();
  });

  it("리렌더가 반복돼도 세그먼트 참조가 유지된다 — 오버레이 재게시가 연쇄하지 않는다 (R6)", async () => {
    stubFetch(() => walkResponse([true, true]));

    const { result, rerender } = renderHook(
      () => useWalkPathsQuery(ROUTE_POINTS),
      { wrapper: queryWrapper },
    );

    await waitFor(() => expect(result.current.segments).toBeDefined());
    const first = result.current.segments;
    rerender();
    rerender();

    expect(result.current.segments).toBe(first);
  });
});
