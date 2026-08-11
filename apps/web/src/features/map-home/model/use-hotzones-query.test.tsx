import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeGridId, type Bounds } from "@/entities/cell";
import { envelopeResponse } from "@/test/envelope-response";
import { useHotZoneCells } from "./use-hotzones-query";

/**
 * 핫구역 훅 (MSG-325 기준 14) — 응답 격자를 테마 셀 형태로 옮긴다.
 * 오버레이 파이프라인(buildHomeOverlayCells)이 center를 다시 encodeGridId하므로,
 * 여기서 만든 center가 원래 gridId로 되돌아와야 강조·빗금 판정이 어긋나지 않는다.
 */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.16, lng: 129.06 },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

const stubHotZones = (gridIds: string[]) => {
  const fetchMock = vi.fn<(input: Request) => Promise<Response>>(async () =>
    envelopeResponse({
      hotZones: gridIds.map((gridId) => {
        const [gridY, gridX] = gridId.split("_").map(Number);
        return {
          gridId,
          gridY,
          gridX,
          score: 12,
          zoneName: null,
          zoneCell: null,
        };
      }),
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

// MSG-357 재기준화: 응답 gridId를 구 스텝 하드코딩 값 대신 서면 좌표에서 현행 체계로 파생한다
const SEOMYEON_GRID_IDS = [
  encodeGridId({ lat: 35.1579, lng: 129.0594 }),
  encodeGridId({ lat: 35.1589, lng: 129.0614 }),
];

describe("useHotZoneCells", () => {
  it("응답 격자의 center를 다시 인코딩하면 원래 gridId로 돌아온다 — 오버레이 id 체계와 일치", async () => {
    stubHotZones(SEOMYEON_GRID_IDS);

    const { result } = renderHook(() => useHotZoneCells(SEOMYEON_VIEWPORT), {
      wrapper,
    });

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map((c) => c.id)).toEqual(SEOMYEON_GRID_IDS);
    for (const cell of result.current) {
      expect(encodeGridId(cell.center)).toBe(cell.id);
    }
  });

  it("데이터가 그대로면 리렌더에도 같은 배열 참조다 — 소비처 useMemo(themeCells) 무효화 방지 (리뷰 반영)", async () => {
    stubHotZones(SEOMYEON_GRID_IDS);

    const { result, rerender } = renderHook(
      () => useHotZoneCells(SEOMYEON_VIEWPORT),
      { wrapper },
    );

    await waitFor(() => expect(result.current).toHaveLength(2));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("빈 목록 응답이면 빈 배열이다 — 상위 K·임계 판정에서 걸러지면 정상 경로다", async () => {
    stubHotZones([]);

    const { result } = renderHook(() => useHotZoneCells(SEOMYEON_VIEWPORT), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toEqual([]);
  });

  it("요청 대상이 아닌 뷰포트(null)에서는 조회하지 않고 빈 배열이다", async () => {
    const fetchMock = stubHotZones([SEOMYEON_GRID_IDS[0]]);

    const { result } = renderHook(() => useHotZoneCells(null), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
