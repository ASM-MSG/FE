import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { useEventLocationsQuery } from "./use-event-locations-query";

const LOCATION_DTO = {
  locationId: 11,
  name: "부산역 웰컴 팝업",
  type: "POPUP",
  operatingHours: "10:00–20:00",
  gridIds: ["16846_11428"],
  representativeGridId: "16846_11428",
  zoneName: null,
  zoneCell: null,
  regionName: null,
  videoCount: 12,
  organizerName: null,
  description: null,
  participationStartsOn: null,
  participationEndsOn: null,
  participationMethod: null,
  imageUrl: null,
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useEventLocationsQuery — 행사 위치 목록 조회 (AC 1·6·10)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("행사방이 열리면 위치 목록을 서버 순서 그대로 준다 (AC 1)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        envelopeResponse([LOCATION_DTO, { ...LOCATION_DTO, locationId: 12 }]),
      ),
    );

    const { result } = renderHook(() => useEventLocationsQuery(7), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.locations.map((l) => l.locationId)).toEqual([11, 12]);
  });

  it("조회 실패는 isError + 빈 목록으로 수렴한다 — RetryNotice 재료 (AC 10)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorEnvelope(13404, "not found", 404)),
    );

    const { result } = renderHook(() => useEventLocationsQuery(7), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.locations).toEqual([]);
  });

  it("행사방이 닫혀 있으면(null) 조회하지 않는다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    renderHook(() => useEventLocationsQuery(null), { wrapper });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
