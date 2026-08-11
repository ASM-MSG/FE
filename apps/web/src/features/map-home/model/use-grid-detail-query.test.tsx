import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
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

/** 재시도를 끈다 — 여기서 검증하는 건 훅의 실패 노출 계약이지 재시도 정책이 아니다 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
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

/** 공통 렌더 — 서면 격자 선택 고정 (시나리오별 차이는 스텁·단정에만 둔다) */
const renderDetail = () =>
  renderHook(() => useGridDetailQuery(SEOMYEON, null), { wrapper });

describe("useGridDetailQuery", () => {
  it("격자 응답을 표시 모델로 조합한다 — 제목은 구역 라벨", async () => {
    stubDetail();

    const { result } = renderDetail();

    await waitFor(() => expect(result.current.detail).not.toBeNull());
    expect(result.current.detail?.gridId).toBe(SEOMYEON);
    expect(result.current.detail?.label).toBe("서면 A-14");
    expect(result.current.detail?.subtitle).toBe("내 영상 4개");
    expect(result.current.isError).toBe(false);
  });

  it("다른 격자를 탭하면 직전 격자의 상세를 그대로 보여주지 않는다 — 새 응답 전까지 비운다", async () => {
    stubDetail();

    const { result, rerender } = renderHook(
      ({ gridId }: { gridId: string }) => useGridDetailQuery(gridId, null),
      { wrapper, initialProps: { gridId: SEOMYEON } },
    );
    await waitFor(() => expect(result.current.detail?.gridId).toBe(SEOMYEON));

    rerender({ gridId: JEONPO });

    // 새 격자의 응답이 오기 전에 직전 격자(서면)의 배지·영상수가 남아 있으면 안 된다
    expect(result.current.detail).toBeNull();

    await waitFor(() => expect(result.current.detail?.gridId).toBe(JEONPO));
    expect(result.current.detail?.label).toBe("전포 A-15");
    expect(result.current.detail?.subtitle).toBe("내 영상 9개");
  });

  it("선택이 없으면(null) 조회하지 않고 null을 돌려준다", async () => {
    const fetchMock = stubDetail();

    const { result } = renderHook(() => useGridDetailQuery(null, null), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.detail).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("격자 조회가 실패하면 실패로 알린다 — 로딩으로 위장하지 않는다 (리뷰 반영)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              developCode: 5000,
              message: "서버 오류",
              data: null,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );

    const { result } = renderDetail();

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 5000,
    });
    expect(result.current.detail).toBeNull();
  });

  it("대표 영상·행정동만 실패하면 상세는 그대로 보여준다 — 선택적 정보다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: Request) => Promise<Response>>(async (request) => {
        const { pathname } = new URL(request.url);
        if (pathname === `/api/grids/${SEOMYEON}`) {
          return envelopeResponse({
            gridId: SEOMYEON,
            occupied: true,
            videoCount: 4,
            zoneName: "서면",
            zoneCell: "A-14",
          });
        }
        return new Response(null, { status: 500 });
      }),
    );

    const { result } = renderDetail();

    await waitFor(() => expect(result.current.detail).not.toBeNull());
    expect(result.current.isError).toBe(false);
    expect(result.current.detail?.coverVideo).toBeNull();
    expect(result.current.detail?.regionLabel).toBeNull();
  });
});

/** cover만 영구 보류하는 스텁 — 선택 정보 병리 지연 모사 (일괄 게이트·유예 상한 공용) */
const stubHungCover = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/cover")) {
        return new Promise<Response>(() => {}); // 영구 보류
      }
      if (url.pathname.startsWith("/api/grids/")) {
        return envelopeResponse({
          gridId: SEOMYEON,
          occupied: true,
          videoCount: 4,
          zoneName: "서면",
          zoneCell: "A-14",
        });
      }
      return envelopeResponse(null);
    }),
  );
};

describe("useGridDetailQuery — 일괄 렌더 게이트 (점진 등장 방지)", () => {
  it("격자 응답만 오고 대표 영상·행정동이 미정착이면 detail을 내놓지 않는다 — 전부 정착 후 한 번에", async () => {
    // cover 응답만 영구 보류 — cell 도착 후에도 detail이 비어 있어야 한다
    stubHungCover();

    const { result } = renderDetail();

    // cell 응답이 처리될 시간을 주고도 detail은 여전히 비어 있어야 한다 (일괄 게이트)
    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThanOrEqual(3),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.detail).toBeNull();
    expect(result.current.isError).toBe(false);
  });
});

describe("useGridDetailQuery — 선택 정보 유예 상한 (영구 로딩 방지)", () => {
  it("cover가 계속 매달려도 유예(3초)가 지나면 격자 정보만으로 상세를 내놓는다", async () => {
    vi.useFakeTimers();
    try {
      stubHungCover();

      const { result } = renderDetail();

      // cell 정착 후에도 유예 안에서는 일괄 게이트가 로딩을 유지한다
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      expect(result.current.detail).toBeNull();

      // 유예 경과 — 선택 정보 없이(빈 분기) 상세를 내놓는다
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(result.current.detail).not.toBeNull();
      expect(result.current.detail?.label).toBe("서면 A-14");
    } finally {
      vi.useRealTimers();
    }
  });
});
