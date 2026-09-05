import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ARCHIVE_DETAIL,
  ARCHIVE_DETAIL_PATH,
  ARCHIVE_LOCATIONS,
  ARCHIVE_LOCATIONS_PATH,
} from "@/test/event-archive-fixture";
import { envelopeResponse } from "@/test/envelope-response";
import { useEventArchiveQuery } from "./use-event-archive-query";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const stubArchiveApis = ({ failLocations = false } = {}) => {
  let locationCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === ARCHIVE_LOCATIONS_PATH) {
        locationCalls += 1;
        // 첫 호출만 실패시키는 스텁 — 재시도 복구 계약 검증용
        if (failLocations && locationCalls === 1) {
          return new Response(null, { status: 500 });
        }
        return envelopeResponse(ARCHIVE_LOCATIONS);
      }
      if (pathname === ARCHIVE_DETAIL_PATH) {
        return envelopeResponse(ARCHIVE_DETAIL);
      }
      return new Response(null, { status: 404 });
    }),
  );
};

describe("useEventArchiveQuery — 종료 행사 상세+위치 조회 (MSG-519 AC 3·5·9)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("상세(행사명·기간·status)와 위치 목록(서버 정렬·videoCount)을 함께 내준다 (AC 3·5)", async () => {
    stubArchiveApis();

    const { result } = renderHook(() => useEventArchiveQuery(7), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.detail?.status).toBe("UPLOAD_GRACE");
    expect(result.current.detail?.startsAt).toBe("2026-07-17T10:00:00");
    expect(result.current.locations?.map((l) => l.locationId)).toEqual([
      11, 12,
    ]);
  });

  it("한쪽(위치)이 실패하면 isError고, retry로 복구된다 (AC 9)", async () => {
    stubArchiveApis({ failLocations: true });

    const { result } = renderHook(() => useEventArchiveQuery(7), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    result.current.retry();

    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.locations).toHaveLength(2);
  });
});
