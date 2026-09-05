import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  approvedEventItem,
  approvedEventList,
} from "@/test/admin-event-fixture";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useAdminEventsQuery } from "./use-admin-events-query";

/** 탭 status로 갈라 응답하는 스텁 — 탭 파라미터 계약을 스텁 분기로 강제한다 */
const stubEventsByStatus = () =>
  stubFetch(async (request) => {
    const status = new URL(request.url).searchParams.get("status");
    if (status === "UPCOMING") {
      return envelopeResponse(
        approvedEventList({
          totalElements: 1,
          events: [
            approvedEventItem({
              submissionId: 55,
              title: "북항 불꽃축제",
              status: "UPCOMING",
            }),
          ],
        }),
      );
    }
    return envelopeResponse(approvedEventList());
  });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useAdminEventsQuery — 승인 행사 목록 조회 (AC 1·2·12)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("기본 탭(EXPOSED)으로 목록과 탭 카운트 3종을 돌려준다 (AC 1)", async () => {
    stubEventsByStatus();

    const { result } = renderHook(() => useAdminEventsQuery("EXPOSED"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data?.events.map((event) => event.title)).toEqual([
      "서면 골목 빛축제",
    ]);
    expect(result.current.data?.exposedCount).toBe(12);
    expect(result.current.data?.upcomingCount).toBe(4);
    expect(result.current.data?.endedCount).toBe(31);
  });

  it("탭을 바꾸면 그 status 목록으로 교체된다 (AC 2)", async () => {
    stubEventsByStatus();

    const { result, rerender } = renderHook(
      ({ status }: { status: "EXPOSED" | "UPCOMING" }) =>
        useAdminEventsQuery(status),
      {
        wrapper,
        initialProps: { status: "EXPOSED" } as {
          status: "EXPOSED" | "UPCOMING";
        },
      },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));

    rerender({ status: "UPCOMING" });

    await waitFor(() =>
      expect(result.current.data?.events.map((event) => event.title)).toEqual([
        "북항 불꽃축제",
      ]),
    );
  });

  it("조회 실패는 isError로 수렴해 재시도 재료가 된다 (AC 12)", async () => {
    stubFetch(async () => errorEnvelope(13000, "서버 오류", 500));

    const { result } = renderHook(() => useAdminEventsQuery("EXPOSED"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
