import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { useGridDetailQuery } from "./use-grid-detail-query";

/**
 * 격자 상세 조합 훅 (MSG-325 기준 8·13).
 * 탭으로 **완전히 다른 엔티티**를 조회하는 훅이라, 뷰포트 이동용 정책
 * (keepPreviousData)을 그대로 쓰면 직전 격자의 상세가 새 격자 자리에 그대로 남는다.
 */
const SEOMYEON = "39064_112221";
const JEONPO = "39065_112223";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

/** gridId별 응답 — cell은 격자마다 다른 videoCount, cover·stat는 null(빈 분기) */
const stubDetail = () => {
  const fetchMock = vi.fn<(input: Request) => Promise<Response>>(
    async (request) => {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/grids/")) {
        const gridId = url.pathname.split("/")[3];
        if (url.pathname.endsWith("/cover")) return envelopeResponse(null);
        return envelopeResponse({
          gridId,
          occupied: true,
          videoCount: gridId === SEOMYEON ? 4 : 9,
          zoneName: gridId === SEOMYEON ? "서면" : "전포",
          zoneCell: gridId === SEOMYEON ? "A-14" : "A-15",
        });
      }
      return envelopeResponse(null);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useGridDetailQuery", () => {
  it("격자 응답을 표시 모델로 조합한다 — 제목은 구역 라벨", async () => {
    stubDetail();

    const { result } = renderHook(() => useGridDetailQuery(SEOMYEON, null), {
      wrapper,
    });

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.gridId).toBe(SEOMYEON);
    expect(result.current?.label).toBe("서면 A-14");
    expect(result.current?.subtitle).toBe("내 영상 4개");
  });

  it("다른 격자를 탭하면 직전 격자의 상세를 그대로 보여주지 않는다 — 새 응답 전까지 비운다", async () => {
    stubDetail();

    const { result, rerender } = renderHook(
      ({ gridId }: { gridId: string }) => useGridDetailQuery(gridId, null),
      { wrapper, initialProps: { gridId: SEOMYEON } },
    );
    await waitFor(() => expect(result.current?.gridId).toBe(SEOMYEON));

    rerender({ gridId: JEONPO });

    // 새 격자의 응답이 오기 전에 직전 격자(서면)의 배지·영상수가 남아 있으면 안 된다
    expect(result.current).toBeNull();

    await waitFor(() => expect(result.current?.gridId).toBe(JEONPO));
    expect(result.current?.label).toBe("전포 A-15");
    expect(result.current?.subtitle).toBe("내 영상 9개");
  });

  it("선택이 없으면(null) 조회하지 않고 null을 돌려준다", async () => {
    const fetchMock = stubDetail();

    const { result } = renderHook(() => useGridDetailQuery(null, null), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
