import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useGridHourlyQuery } from "./use-grid-hourly-query";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGridHourlyQuery — 격자 시간대 업로드 (AC 12)", () => {
  it("응답 시간대를 24칸 막대로 바꿔 준다 (AC 12)", async () => {
    stubFetch(async () =>
      envelopeResponse({
        gridId: "39064_112221",
        hours: [
          { hour: 17, count: 1 },
          { hour: 18, count: 3 },
        ],
      }),
    );

    const { result } = renderHook(() => useGridHourlyQuery("39064_112221"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.chart.hasData).toBe(true));
    expect(result.current.chart.bars).toHaveLength(24);
    expect(result.current.chart.total).toBe(4);
  });

  it("격자가 선택되지 않았으면 조회하지 않는다 (AC 12 — 격자 상세 전용)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse({ gridId: "x", hours: [{ hour: 1, count: 1 }] }),
    );

    const { result } = renderHook(() => useGridHourlyQuery(null), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
    expect(result.current.chart.hasData).toBe(false);
  });
});
