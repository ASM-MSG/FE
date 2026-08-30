import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { useAiRouteStore } from "@/features/ai-route/model/ai-route-store";
import {
  SECONDARY_MIN_INTERVAL_MS,
  VIEWPORT_SETTLE_TIMEOUT_MS,
  toViewportDto,
} from "@/features/ai-route/model/route-request";
import { MAP_SCALE_1KM_ZOOM } from "@/features/map-home/model/map-scale";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import type { MentionedAreaDto } from "@/shared/api/generated";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
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
/**
 * 줌 9(축척 16km)에서 아직 1km로 정착하지 못한 뷰포트 — 검증 실측 span 1.9379° × 4.7461°.
 * 현위치를 품고 있어 제출은 정상 진입한다(originActive true).
 */
const UNSETTLED_WIDE: Bounds = {
  sw: { lat: 34.2, lng: 126.6 },
  ne: { lat: 36.1379, lng: 131.3461 },
};

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

/** 렌더 → 현위치 확보 대기 → 제출. 제출 전 줌은 각 시나리오가 세팅한다 */
const renderAndSubmit = async (onLoginRequired = vi.fn()) => {
  const rendered = renderHook(() => useAiRouteAutoMove({ onLoginRequired }), {
    wrapper,
  });

  await waitFor(() => expect(rendered.result.current.originActive).toBe(true));
  act(() => rendered.result.current.submit());

  return rendered;
};

/** 제출 → 자동 이동 명령 도착까지 */
const submitAndAwaitMove = async (onLoginRequired = vi.fn()) => {
  const rendered = await renderAndSubmit(onLoginRequired);
  await waitFor(() => expect(moveTo).toHaveBeenCalledTimes(1));

  return rendered;
};

/** 지도가 새 뷰포트로 정착한다 — 줌 단은 시나리오가 정한다(기본은 목표 1km) */
const settleViewport = (bounds: Bounds, zoom = MAP_SCALE_1KM_ZOOM) => {
  act(() => useViewportStore.setState({ bounds, zoom }));
};

/** 지도 이동이 반영돼 새 bounds가 들어오고, 서버 10초 창도 지난 상태를 만든다 */
const settleNewViewport = () => {
  act(() =>
    useAiRouteStore.setState({
      requestedAt: Date.now() - SECONDARY_MIN_INTERVAL_MS,
    }),
  );
  settleViewport(BOUNDS_AFTER);
};

/** 제출 → 자동 이동 → 서버 10초 창 경과 → 대기 중 사용자가 지도를 바꾼다 (도달 실패 경로) */
const submitThenDisturbViewport = async (bounds: Bounds, zoom: number) => {
  const rendered = await submitAndAwaitMove();
  act(() =>
    useAiRouteStore.setState({
      requestedAt: Date.now() - SECONDARY_MIN_INTERVAL_MS,
    }),
  );
  settleViewport(bounds, zoom);

  return rendered;
};

/** 지도가 목표 축척으로 정착하면 그 뷰포트로 1차가 1회 나간다 — 정규화 경로의 공통 종착 */
const settleAndExpectPrimaryFired = async (
  received: ReturnType<typeof stubBothWithMentionedArea>,
) => {
  settleViewport(BOUNDS_AFTER);

  await waitFor(() => expect(received).toHaveLength(1));
  expect(received[0].body).toMatchObject({
    viewport: toViewportDto(BOUNDS_AFTER),
  });
};

/**
 * 탭 가시성 스텁 — jsdom의 `document.visibilityState`는 프로토타입 getter라 재정의로 바꾼다.
 * 숨은 탭에서는 rAF가 멈춰 지도가 `idle`을 내지 않는다(§12 결함의 조건).
 */
const setVisibility = (state: DocumentVisibilityState) => {
  act(() => {
    Object.defineProperty(document, "visibilityState", {
      value: state,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
};

/** 목표(1km)를 벗어난 줌 — 이 줌으로 갱신하는 한 도달 판정은 영영 성립하지 않는다 */
const OFF_TARGET_ZOOM = 16;

/** 사용자가 지도를 조금씩 미는 상황 — 갱신마다 두 대기 이펙트가 재실행된다 */
const pannedBounds = (step: number): Bounds => ({
  sw: { lat: 35.1521 + step * 0.001, lng: 129.0537 + step * 0.001 },
  ne: { lat: 35.1662 + step * 0.001, lng: 129.0712 + step * 0.001 },
});

/**
 * `intervalMs`마다 뷰포트를 갱신하며 `until()`이 참이 될 때까지 기다린다 (§13 P2 재현).
 * 참이 된 시점까지 걸린 ms를 돌려주고, `times`번 안에 참이 안 되면 Infinity —
 * 상한이 갱신마다 초기화되면(결함) 영원히 참이 되지 않는다.
 */
const panUntil = async ({
  times,
  intervalMs = 200,
  until,
}: {
  times: number;
  intervalMs?: number;
  until: () => boolean;
}): Promise<number> => {
  const startedAt = Date.now();
  for (let step = 1; step <= times; step += 1) {
    settleViewport(pannedBounds(step), OFF_TARGET_ZOOM);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    });
    if (until()) return Date.now() - startedAt;
  }
  return Number.POSITIVE_INFINITY;
};

/** 정착 상한을 실제로 넘겨 본다 — 이 훅의 대기는 실타이머 기반이다 */
const waitPastSettleTimeout = async () => {
  await act(async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, VIEWPORT_SETTLE_TIMEOUT_MS + 300),
    );
  });
};

beforeEach(() => {
  useAiRouteStore.setState(useAiRouteStore.getInitialState(), true);
  useAiRouteStore.getState().setText("해운대에서 저녁 먹고 산책");
  useViewportStore.setState({
    bounds: BOUNDS_BEFORE,
    zoom: MAP_SCALE_1KM_ZOOM,
  });
  allowPositionAt(CURRENT_POSITION);
  setVisibility("visible");
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
    settleViewport({
      sw: { lat: 35.15, lng: 129.15 },
      ne: { lat: 35.18, lng: 129.18 },
    });

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
      useViewportStore.setState({
        bounds: BOUNDS_AFTER,
        zoom: MAP_SCALE_1KM_ZOOM,
      });
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
    settleViewport(BOUNDS_AFTER);
    await act(async () => {
      await Promise.resolve();
    });

    expect(received).toHaveLength(1);
    expect(useAiRouteStore.getState().status).toBe("loading");
    expect(useAiRouteStore.getState().points).toHaveLength(0);
  });
});

describe("항상 1km 정규화 (L20~L23·D10·D11)", () => {
  /** 제출 시점 줌이 1km 단이 아닌 상태 — 정규화 대기로 들어간다 */
  const startWide = () =>
    useViewportStore.setState({ bounds: BOUNDS_BEFORE, zoom: 16 });

  it("현재 줌이 1km 단이 아니면 제출이 요청을 보내지 않고 줌만 맞춘다 (L20)", async () => {
    const received = stubBothWithMentionedArea();
    startWide();

    await renderAndSubmit();

    expect(zoomTo).toHaveBeenCalledTimes(1);
    expect(zoomTo).toHaveBeenCalledWith(MAP_SCALE_1KM_ZOOM);
    expect(received).toHaveLength(0);
  });

  it("제출 클릭 즉시 로딩이고 요청 시각은 mutate 시점에만 기록된다 (L23·D11)", async () => {
    stubBothWithMentionedArea();
    startWide();

    await renderAndSubmit();

    expect(useAiRouteStore.getState().status).toBe("loading");
    expect(useAiRouteStore.getState().requestedAt).toBeNull();
  });

  it("줌이 목표에 도달하면 요청이 정확히 1회 나간다 — StrictMode 2회 실행 포함 (L22)", async () => {
    const received = stubBothWithMentionedArea();
    startWide();

    await renderAndSubmit();
    await settleAndExpectPrimaryFired(received);

    expect(useAiRouteStore.getState().requestedAt).not.toBeNull();
    // 새 뷰포트가 또 들어와도 1차가 다시 나가지 않는다
    settleViewport(BOUNDS_BEFORE);
    expect(received).toHaveLength(1);
  });

  it("이미 1km 단이면 줌 명령 없이 즉시 발사한다 (L21)", async () => {
    const received = stubBothWithMentionedArea();

    await renderAndSubmit();

    // 자동 이동 응답이 오기 전 — 정규화 줌 명령이 아예 없어야 한다
    expect(zoomTo).not.toHaveBeenCalled();
    await waitFor(() => expect(received).toHaveLength(1));
  });
});

describe("2차 종결 보장과 결과 후 자유 확대 (L24·L25)", () => {
  it("목표 도달에 실패해도 대기 창이 지나면 현재 뷰포트로 2차가 1회 나간다 (L24 — 영구 로딩 금지)", async () => {
    const received = stubBothWithMentionedArea();

    // 대기 중 사용자가 줌을 바꿔 목표(1km)를 벗어난다 — 도달 판정이 영영 성립하지 않는다
    await submitThenDisturbViewport(BOUNDS_AFTER, 16);

    expect(received).toHaveLength(1);
    await waitFor(() => expect(received).toHaveLength(2), {
      timeout: VIEWPORT_SETTLE_TIMEOUT_MS + 1_000,
    });
    expect(received[1].body).toMatchObject({
      viewport: toViewportDto(BOUNDS_AFTER),
    });
    await waitFor(() =>
      expect(useAiRouteStore.getState().status).toBe("result"),
    );
  });

  it("결과 상태에서 뷰포트가 바뀌어도 recommend가 추가로 나가지 않는다 (L25)", async () => {
    const received = stubFetch(() =>
      envelopeResponse({
        points: ROUTE_POINTS,
        notice: null,
        mentionedArea: null,
      }),
    );

    await renderAndSubmit();
    await waitFor(() =>
      expect(useAiRouteStore.getState().status).toBe("result"),
    );

    settleViewport(BOUNDS_AFTER, 16);
    settleViewport(BOUNDS_BEFORE);

    expect(received).toHaveLength(1);
    expect(zoomTo).not.toHaveBeenCalled();
  });
});

describe("서버 뷰포트 상한 가드와 탭 가시성 (§12 — 14401 재현 방지)", () => {
  /** 줌 9에서 제출 — 정규화 대기로 들어가지만 지도가 정착하지 못한 상태를 만든다 */
  const startUnsettledWide = () =>
    useViewportStore.setState({ bounds: UNSETTLED_WIDE, zoom: 9 });

  it("정착 상한이 만료돼도 뷰포트가 서버 상한을 넘으면 요청을 보내지 않고 안내로 종결한다 (§12·S8)", async () => {
    const received = stubBothWithMentionedArea();
    startUnsettledWide();

    await renderAndSubmit();

    await waitFor(
      () => expect(useAiRouteStore.getState().status).toBe("error"),
      { timeout: VIEWPORT_SETTLE_TIMEOUT_MS + 1_000 },
    );
    expect(received).toHaveLength(0);
    // 사용자가 다시 누를 수 있어야 한다 — 영구 로딩도, 확정 400도 아니다 (D13)
    expect(useAiRouteStore.getState().errorNotice?.retryable).toBe(true);
    expect(useAiRouteStore.getState().normalizePending).toBe(false);
  });

  it("숨은 탭에서는 정착 상한을 소모하지 않고, 복귀 후 정착한 1km 뷰포트로 1회 나간다 (§12)", async () => {
    const received = stubBothWithMentionedArea();
    startUnsettledWide();
    setVisibility("hidden");

    await renderAndSubmit();
    await waitPastSettleTimeout();

    expect(received).toHaveLength(0);
    expect(useAiRouteStore.getState().status).toBe("loading");

    // 탭 복귀 → rAF 재개 → 지도가 목표 축척으로 정착한다
    setVisibility("visible");
    await settleAndExpectPrimaryFired(received);

    expect(useAiRouteStore.getState().status).not.toBe("error");
  });

  it("2차 종결 상한에서도 과대 뷰포트로는 쏘지 않고 안내로 종결한다 (§12 — 어떤 경로로도)", async () => {
    const received = stubBothWithMentionedArea();

    // 대기 중 사용자가 크게 줌아웃 — 도달 실패 + 상한 초과가 겹치는 경로
    await submitThenDisturbViewport(UNSETTLED_WIDE, 9);

    await waitFor(
      () => expect(useAiRouteStore.getState().status).toBe("error"),
      { timeout: VIEWPORT_SETTLE_TIMEOUT_MS + 1_000 },
    );
    expect(received).toHaveLength(1);
    expect(useAiRouteStore.getState().secondaryPending).toBe(false);
  });
});

describe("codex 리뷰 반영 — 2차 인증 처리와 대기 마감 (§13)", () => {
  /** 1차는 이동 신호, 2차는 세션 만료 — 1차 성공과 지연된 2차 사이에 세션이 끊긴 경우 */
  const stubSecondaryUnauthorized = () => {
    let call = 0;
    return stubFetch(() => {
      call += 1;
      return call === 1
        ? envelopeResponse({
            points: ROUTE_POINTS,
            notice: null,
            mentionedArea: MENTIONED_AREA,
          })
        : errorEnvelope(2403, "인증이 필요합니다", 401);
    });
  };

  it("2차가 401이면 1차와 똑같이 로그인 모달 콜백이 호출된다 (§13 P1)", async () => {
    const received = stubSecondaryUnauthorized();
    const onLoginRequired = vi.fn();

    await submitAndAwaitMove(onLoginRequired);
    settleNewViewport();

    await waitFor(() => expect(received).toHaveLength(2));
    await waitFor(() => expect(onLoginRequired).toHaveBeenCalledTimes(1));
    // 로그인 필요는 에러 화면 없이 입력 대기로 돌아간다 (§1-3)
    expect(useAiRouteStore.getState().status).toBe("idle");
  });

  it("정규화 대기 중 뷰포트가 반복 갱신돼도 최초 예약 상한 안에 종결한다 (§13 P2 — D13)", async () => {
    const received = stubBothWithMentionedArea();
    useViewportStore.setState({
      bounds: BOUNDS_BEFORE,
      zoom: OFF_TARGET_ZOOM,
    });

    await renderAndSubmit();
    expect(received).toHaveLength(0);

    // 사용자가 계속 패닝한다 — 갱신마다 상한을 다시 재면 요청이 영영 안 나간다
    const elapsed = await panUntil({
      times: 30,
      until: () => received.length > 0,
    });

    expect(elapsed).toBeLessThan(VIEWPORT_SETTLE_TIMEOUT_MS + 1_500);
    expect(useAiRouteStore.getState().normalizePending).toBe(false);
  }, 20_000);

  it("2차 대기 중 뷰포트가 반복 갱신돼도 최초 예약 상한 안에 종결한다 (§13 P2 — D13)", async () => {
    const received = stubBothWithMentionedArea();

    await submitAndAwaitMove();
    act(() =>
      useAiRouteStore.setState({
        requestedAt: Date.now() - SECONDARY_MIN_INTERVAL_MS,
      }),
    );

    const elapsed = await panUntil({
      times: 30,
      until: () => received.length > 1,
    });

    expect(elapsed).toBeLessThan(VIEWPORT_SETTLE_TIMEOUT_MS + 1_500);
    expect(useAiRouteStore.getState().secondaryPending).toBe(false);
  }, 20_000);

  it("숨은 구간은 마감에서 제외되고 복귀 후 남은 시간만 기다린다 (§13 P2 + §12 가시성)", async () => {
    const received = stubBothWithMentionedArea();
    useViewportStore.setState({
      bounds: BOUNDS_BEFORE,
      zoom: OFF_TARGET_ZOOM,
    });

    await renderAndSubmit();

    // ① 가시 상태로 상한의 절반가량을 소모한다 (약 1.7초)
    expect(await panUntil({ times: 8, until: () => received.length > 0 })).toBe(
      Number.POSITIVE_INFINITY,
    );

    // ② 숨은 동안에는 지도가 정착하지 못하므로 마감이 흐르지 않는다 (§12)
    setVisibility("hidden");
    await panUntil({ times: 12, until: () => received.length > 0 });
    expect(received).toHaveLength(0);

    // ③ 복귀 후에는 **남은 시간만** 기다린다 — 상한을 처음부터 다시 재면 3초가 걸린다
    setVisibility("visible");
    const afterReturn = await panUntil({
      times: 20,
      until: () => received.length > 0,
    });

    expect(afterReturn).toBeLessThan(2_200);
  }, 30_000);
});
