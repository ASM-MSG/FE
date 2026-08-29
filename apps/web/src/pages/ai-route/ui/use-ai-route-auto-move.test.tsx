import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { useAiRouteStore } from "@/features/ai-route/model/ai-route-store";
import {
  SECONDARY_MIN_INTERVAL_MS,
  toViewportDto,
} from "@/features/ai-route/model/route-request";
import { MAP_SCALE_1KM_ZOOM } from "@/features/map-home/model/map-scale";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import type { MentionedAreaDto } from "@/shared/api/generated";
import { envelopeResponse } from "@/test/envelope-response";
import { allowPositionAt, setGeolocation } from "@/test/geolocation";
import { ROUTE_POINTS } from "@/test/route-points";
import { stubFetch } from "@/test/stub-fetch";
import type { MapShellContext } from "@/widgets/map-shell/use-map-shell";
import { useAiRouteAutoMove } from "./use-ai-route-auto-move";

/**
 * 자동 이동 오케스트레이션 (MSG-489 L16~L19).
 * 지도 명령(moveTo·zoomTo)은 Outlet context로 주입되는 `MapShellContext` 스텁으로 관찰하고,
 * 요청 계약은 네트워크 경계 스텁(stub-fetch)이 받은 body로만 확인한다.
 */
const moveTo = vi.fn();
const zoomTo = vi.fn();

const mapShellContext = {
  moveTo,
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  zoomTo,
  fitBounds: vi.fn(),
  locate: vi.fn(),
} satisfies MapShellContext;

/** 요청 시점 뷰포트 — 부산 서면. 현위치를 품고 있어 1차 요청에 origin이 실린다 */
const BOUNDS_BEFORE: Bounds = {
  sw: { lat: 35.1521, lng: 129.0537 },
  ne: { lat: 35.1662, lng: 129.0712 },
};
/** 자동 이동 후 뷰포트 — 현위치를 품지 않는다(L19: 2차는 origin 없이 나간다) */
const BOUNDS_AFTER: Bounds = {
  sw: { lat: 35.1523, lng: 129.1521 },
  ne: { lat: 35.1712, lng: 129.1712 },
};
const CURRENT_POSITION = { lat: 35.1579, lng: 129.0594 };

const MENTIONED_AREA: MentionedAreaDto = {
  name: "부산 해운대",
  centerLat: 35.1618,
  centerLng: 129.1618,
  minLat: 35.1523,
  minLng: 129.1521,
  maxLat: 35.1712,
  maxLng: 129.1712,
  kind: "MOVE",
};

const originalGeolocation = navigator.geolocation;

// StrictMode로 감싼다 — dev의 이펙트 2회 실행에서 자동 이동·2차 발사가 중복되지 않아야 한다
const wrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={["/ai-route"]}>
        <Routes>
          <Route element={<Outlet context={mapShellContext} />}>
            <Route path="/ai-route" element={children} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  </StrictMode>
);

/** 1·2차 응답 모두 mentionedArea를 실어 준다 — 2차 무시(L17)를 같은 스텁으로 확인한다 */
const stubBothWithMentionedArea = () =>
  stubFetch(() =>
    envelopeResponse({
      points: ROUTE_POINTS,
      notice: null,
      mentionedArea: MENTIONED_AREA,
    }),
  );

/** 현위치 확보 대기 → 1차 제출 → 자동 이동 명령 도착까지 */
const submitAndAwaitMove = async () => {
  const rendered = renderHook(
    () => useAiRouteAutoMove({ onLoginRequired: vi.fn() }),
    { wrapper },
  );

  await waitFor(() => expect(rendered.result.current.originActive).toBe(true));
  act(() => rendered.result.current.submit());
  await waitFor(() => expect(moveTo).toHaveBeenCalledTimes(1));

  return rendered;
};

/** 지도 이동이 반영돼 새 bounds가 들어오고, 서버 10초 창도 지난 상태를 만든다 */
const settleNewViewport = () => {
  act(() => {
    useAiRouteStore.setState({
      requestedAt: Date.now() - SECONDARY_MIN_INTERVAL_MS,
    });
    useViewportStore.setState({ bounds: BOUNDS_AFTER });
  });
};

beforeEach(() => {
  useAiRouteStore.setState(useAiRouteStore.getInitialState(), true);
  useAiRouteStore.getState().setText("해운대에서 저녁 먹고 산책");
  useViewportStore.setState({ bounds: BOUNDS_BEFORE });
  allowPositionAt(CURRENT_POSITION);
  moveTo.mockClear();
  zoomTo.mockClear();
});

afterEach(() => {
  setGeolocation(originalGeolocation);
  vi.unstubAllGlobals();
});

describe("useAiRouteAutoMove — 언급 지역 자동 이동과 2차 재요청 (L16~L19)", () => {
  it("mentionedArea가 실린 1차 응답에서 지도를 옮기고 1km 축척으로 고정한 뒤 2차를 1회 쏜다 (L16)", async () => {
    const received = stubBothWithMentionedArea();

    await submitAndAwaitMove();
    settleNewViewport();

    await waitFor(() => expect(received).toHaveLength(2));
    expect(moveTo).toHaveBeenCalledWith({
      lat: MENTIONED_AREA.centerLat,
      lng: MENTIONED_AREA.centerLng,
    });
    expect(zoomTo).toHaveBeenCalledTimes(1);
    expect(zoomTo).toHaveBeenCalledWith(MAP_SCALE_1KM_ZOOM);
  });

  it("2차 응답에 mentionedArea가 또 실려도 추가 이동·재요청이 없다 (L17)", async () => {
    const received = stubBothWithMentionedArea();

    await submitAndAwaitMove();
    settleNewViewport();
    await waitFor(() => expect(received).toHaveLength(2));
    await waitFor(() =>
      expect(useAiRouteStore.getState().status).toBe("result"),
    );
    // 2차 응답 뒤 뷰포트가 또 갱신돼도 예약이 남아 있지 않다
    act(() =>
      useViewportStore.setState({
        bounds: {
          sw: { lat: 35.15, lng: 129.15 },
          ne: { lat: 35.18, lng: 129.18 },
        },
      }),
    );

    expect(received).toHaveLength(2);
    expect(moveTo).toHaveBeenCalledTimes(1);
    expect(zoomTo).toHaveBeenCalledTimes(1);
  });

  it("2차 요청 뷰포트는 이동 후 새 bounds로 만들어진다 (L18)", async () => {
    const received = stubBothWithMentionedArea();

    await submitAndAwaitMove();
    settleNewViewport();

    await waitFor(() => expect(received).toHaveLength(2));
    expect(received[0].body).toMatchObject({
      viewport: toViewportDto(BOUNDS_BEFORE),
    });
    expect(received[1].body).toMatchObject({
      viewport: toViewportDto(BOUNDS_AFTER),
    });
  });

  it("2차 요청의 출발지는 새 뷰포트로 재판정된다 — 이동 후 현위치가 밖이면 싣지 않는다 (L19)", async () => {
    const received = stubBothWithMentionedArea();

    await submitAndAwaitMove();
    settleNewViewport();

    await waitFor(() => expect(received).toHaveLength(2));
    expect(received[0].body).toMatchObject({ origin: CURRENT_POSITION });
    expect(received[1].body).not.toHaveProperty("origin");
  });

  it("섹션을 나갔다 돌아와도 예약된 2차는 1회만 나간다 (A7 — 마운트 시 재개)", async () => {
    const received = stubBothWithMentionedArea();
    act(() => {
      useAiRouteStore.setState({
        status: "loading",
        autoMoved: true,
        movedAreaName: "부산 해운대",
        secondaryPending: true,
        requestedAt: Date.now() - SECONDARY_MIN_INTERVAL_MS,
      });
      useViewportStore.setState({ bounds: BOUNDS_AFTER });
    });

    renderHook(() => useAiRouteAutoMove({ onLoginRequired: vi.fn() }), {
      wrapper,
    });

    await waitFor(() =>
      expect(useAiRouteStore.getState().status).toBe("result"),
    );
    expect(received).toHaveLength(1);
    expect(moveTo).not.toHaveBeenCalled();
  });

  it("서버 10초 창이 남아 있으면 새 bounds가 와도 2차를 즉시 쏘지 않는다 (Q2 안 B)", async () => {
    const received = stubBothWithMentionedArea();

    await submitAndAwaitMove();
    act(() => useViewportStore.setState({ bounds: BOUNDS_AFTER }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(received).toHaveLength(1);
    expect(useAiRouteStore.getState().status).toBe("loading");
    expect(useAiRouteStore.getState().points).toHaveLength(0);
  });
});
