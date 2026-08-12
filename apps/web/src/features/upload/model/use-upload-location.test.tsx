import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { SEOMYEON_CENTER } from "@/shared/geolocation";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import {
  formatUploadLocationLabel,
  useUploadLocation,
} from "./use-upload-location";

/**
 * 업로드 위치 라벨 (B2) — mock "A-14" 상수 폐기. 좌표는 지도 뷰포트 중심(결정 A 확정),
 * 라벨은 GET /api/regions/reverse-geocode의 regionName(행정동)이다 (스펙 추정 2 기본안 —
 * Figma "서면 A-14 (현재 위치)"는 point→zone API 부재로 의도적 차이, 오탐 방지 4).
 */

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  useViewportStore.setState({ center: SEOMYEON_CENTER });
  useUploadModalStore.setState({ target: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useUploadLocation — 뷰포트 중심 파생 (B2)", () => {
  it("지도 뷰포트 중심 좌표로 reverse-geocode를 호출하고 regionName을 라벨로 쓴다", async () => {
    useViewportStore.setState({ center: { lat: 35.1579, lng: 129.0594 } });
    const received = stubFetch(() =>
      envelopeResponse({
        regionCode: "2644056000",
        regionName: "부산 부산진구 부전동",
        parentCode: "26440",
      }),
    );

    const { result } = renderHook(() => useUploadLocation(), {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(result.current.label).toBe("부산 부산진구 부전동"),
    );

    const url = new URL(received[0].request.url);
    expect(url.pathname).toBe("/api/regions/reverse-geocode");
    expect(url.searchParams.get("lat")).toBe("35.1579");
    expect(url.searchParams.get("lng")).toBe("129.0594");
    // POST /api/videos body의 lat/lng도 같은 중심 좌표다 (B9 연동)
    expect(result.current.center).toEqual({ lat: 35.1579, lng: 129.0594 });
  });

  it("무귀속 좌표(data null — 바다 등)면 일반 라벨로 폴백한다", async () => {
    stubFetch(() => envelopeResponse(null));

    const { result } = renderHook(() => useUploadLocation(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.label).toBe("현재 위치");
  });
});

describe("formatUploadLocationLabel — 라벨 파생 순수 함수 (B2)", () => {
  it("행정동 응답이 있으면 regionName, 없으면 '현재 위치'다", () => {
    expect(
      formatUploadLocationLabel({
        regionCode: "1",
        regionName: "부산 부산진구 서면",
        parentCode: null,
      }),
    ).toBe("부산 부산진구 서면");
    expect(formatUploadLocationLabel(null)).toBe("현재 위치");
    expect(formatUploadLocationLabel(undefined)).toBe("현재 위치");
  });
});

describe("useUploadLocation — 지목 격자 우선 (격자 고정 진입)", () => {
  it("스토어에 지목 좌표(target)가 있으면 뷰포트 중심 대신 그 좌표로 조회·전송한다 (AC1)", async () => {
    useViewportStore.setState({ center: SEOMYEON_CENTER });
    useUploadModalStore.setState({ target: { lat: 35.1652, lng: 129.0656 } });
    const received = stubFetch(() =>
      envelopeResponse({
        regionCode: "2644057000",
        regionName: "부산 부산진구 전포동",
        parentCode: "26440",
      }),
    );

    const { result } = renderHook(() => useUploadLocation(), {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(result.current.label).toBe("부산 부산진구 전포동"),
    );

    const url = new URL(received[0].request.url);
    expect(url.searchParams.get("lat")).toBe("35.1652");
    expect(url.searchParams.get("lng")).toBe("129.0656");
    expect(result.current.center).toEqual({ lat: 35.1652, lng: 129.0656 });
  });
});

describe("useUploadLocation — 비정상 지목 좌표 방어", () => {
  it("지목 좌표가 NaN이면(목 id 셀 등) 뷰포트 중심으로 폴백한다 — NaN은 JSON null이 되어 서버 400", async () => {
    useViewportStore.setState({ center: { lat: 35.1579, lng: 129.0594 } });
    useUploadModalStore.setState({ target: { lat: NaN, lng: NaN } });
    const received = stubFetch(() =>
      envelopeResponse({
        regionCode: "2644056000",
        regionName: "부산 부산진구 부전동",
        parentCode: "26440",
      }),
    );

    const { result } = renderHook(() => useUploadLocation(), {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(result.current.label).toBe("부산 부산진구 부전동"),
    );

    const url = new URL(received[0].request.url);
    expect(url.searchParams.get("lat")).toBe("35.1579");
    expect(result.current.center).toEqual({ lat: 35.1579, lng: 129.0594 });
  });
});
