import { beforeEach, describe, expect, it } from "vitest";
import { ROUTE_POINTS } from "@/test/route-points";
import { useAiRouteStore } from "./ai-route-store";

const store = () => useAiRouteStore.getState();

const LOGIN_REQUIRED = {
  message: null,
  retryable: false,
  disablesFeature: false,
  requiresLogin: true,
} as const;

const FEATURE_OFF = {
  message: "지금은 경로 추천을 쓸 수 없어요",
  retryable: false,
  disablesFeature: true,
  requiresLogin: false,
} as const;

describe("useAiRouteStore — 요청·결과 상태 전이 (L7)", () => {
  beforeEach(() => {
    useAiRouteStore.setState(useAiRouteStore.getInitialState(), true);
  });

  it("초기 상태는 입력 대기(idle)이고 입력·결과가 비어 있다 (L7)", () => {
    expect(store().status).toBe("idle");
    expect(store().text).toBe("");
    expect(store().points).toEqual([]);
  });

  it("요청을 시작하면 loading이 되고, 결과가 도착하면 result가 된다 (L7)", () => {
    store().setText("서면에서 밥 먹고 저녁 경기까지");

    store().startRequest();
    expect(store().status).toBe("loading");

    store().succeed(ROUTE_POINTS, null);
    expect(store().status).toBe("result");
    expect(store().points.map((p) => p.order)).toEqual([1, 2, 3]);
    expect(store().text).toBe("서면에서 밥 먹고 저녁 경기까지");
  });

  it("새 요청을 시작하면 이전 결과·안내·선택이 먼저 비워진다 — 잔상이 남지 않는다 (L7)", () => {
    store().succeed(ROUTE_POINTS, "부족 안내");
    store().selectOrder(2);

    store().startRequest();

    expect(store().points).toEqual([]);
    expect(store().notice).toBeNull();
    expect(store().selectedOrder).toBeNull();
  });

  it("요청이 실패하면 error가 되고 안내가 실리며 입력 문장은 유지된다 (L7)", () => {
    store().setText("서면 동선");
    store().startRequest();

    store().fail({
      message: "잠시 후 다시 시도해 주세요",
      retryable: true,
      disablesFeature: false,
      requiresLogin: false,
    });

    expect(store().status).toBe("error");
    expect(store().errorNotice?.message).toBe("잠시 후 다시 시도해 주세요");
    expect(store().text).toBe("서면 동선");
  });

  it("로그인이 필요한 실패는 에러 문구 없이 입력 대기로 되돌아간다 (L7, §1-4)", () => {
    store().setText("서면 동선");
    store().startRequest();

    store().fail(LOGIN_REQUIRED);

    expect(store().status).toBe("idle");
    expect(store().errorNotice).toBeNull();
    expect(store().text).toBe("서면 동선");
  });

  it("기능 꺼짐(14503) 실패는 세션 동안 featureDisabled를 켠 채 유지된다 (L7, §1-4)", () => {
    store().startRequest();
    store().fail(FEATURE_OFF);

    expect(store().featureDisabled).toBe(true);

    store().reset();
    expect(store().featureDisabled).toBe(true);
  });

  it("selectOrder가 선택 지점을 바꾸고 null로 해제한다 (L7)", () => {
    store().succeed(ROUTE_POINTS, null);

    store().selectOrder(2);
    expect(store().selectedOrder).toBe(2);

    store().selectOrder(null);
    expect(store().selectedOrder).toBeNull();
  });

  it("reset은 입력 문장까지 비워 입력 대기로 되돌린다 (L7, 레일 재클릭 2단)", () => {
    store().setText("서면 동선");
    store().succeed(ROUTE_POINTS, "부족 안내");
    store().selectOrder(1);

    store().reset();

    expect(store().status).toBe("idle");
    expect(store().text).toBe("");
    expect(store().points).toEqual([]);
    expect(store().notice).toBeNull();
    expect(store().selectedOrder).toBeNull();
  });
});

describe("2차 자동 재요청 사이클 (L14·L15)", () => {
  beforeEach(() => {
    useAiRouteStore.setState(useAiRouteStore.getInitialState(), true);
  });

  it("2차 요청을 시작하면 로딩을 유지한 채 1차 결과를 게시하지 않고 자동 이동을 기록한다 (L14)", () => {
    store().startRequest();

    store().startSecondaryRequest("부산 서면");

    expect(store().status).toBe("loading");
    expect(store().points).toHaveLength(0);
    expect(store().autoMoved).toBe(true);
    expect(store().movedAreaName).toBe("부산 서면");
    expect(store().secondaryPending).toBe(true);
  });

  it("새 1차 요청은 자동 이동·출발지·이동 지역명을 초기화한다 (L15)", () => {
    store().startRequest(true);
    store().startSecondaryRequest("부산 서면");
    store().markSecondarySent(true);

    store().startRequest();

    expect(store().autoMoved).toBe(false);
    expect(store().originSent).toBe(false);
    expect(store().movedAreaName).toBeNull();
    expect(store().secondaryPending).toBe(false);
  });

  it("요청 시작 시각을 기록한다 — 2차 발사가 서버 10초 창을 계산하는 기준 (Q2 안 B)", () => {
    const before = Date.now();

    store().startRequest();

    expect(store().requestedAt).not.toBeNull();
    expect(store().requestedAt!).toBeGreaterThanOrEqual(before);
  });

  it("출발지를 실어 보낸 요청은 originSent를 켠다 — 결과 화면 버튼 문구의 근거 (L13 배선)", () => {
    store().startRequest(true);

    expect(store().originSent).toBe(true);
  });
});

describe("축척 정규화 대기 (L23·D11)", () => {
  beforeEach(() => {
    useAiRouteStore.setState(useAiRouteStore.getInitialState(), true);
  });

  it("정규화 대기를 시작하면 즉시 로딩이지만 요청 시각은 아직 기록하지 않는다 (L23)", () => {
    store().startNormalize();

    expect(store().status).toBe("loading");
    expect(store().normalizePending).toBe(true);
    expect(store().requestedAt).toBeNull();
  });

  it("실제 mutate 시점에 요청 시각이 기록되고 정규화 대기가 풀린다 (L23)", () => {
    store().startNormalize();
    const before = Date.now();

    store().startRequest();

    expect(store().normalizePending).toBe(false);
    expect(store().requestedAt!).toBeGreaterThanOrEqual(before);
  });

  it("정규화 대기는 이전 결과를 먼저 비운다 — 잔상이 로딩 중에 남지 않는다 (D11)", () => {
    store().startRequest();
    store().succeed(ROUTE_POINTS, null);

    store().startNormalize();

    expect(store().points).toHaveLength(0);
    expect(store().selectedOrder).toBeNull();
  });
});

describe("요청 없이 대기를 종결한다 (§12 — 영구 로딩·확정 400 동시 금지)", () => {
  /** 뷰포트가 서버 상한을 넘어 보낼 수 없을 때의 안내 (route-error VIEWPORT_TOO_WIDE_NOTICE와 같은 모양) */
  const TOO_WIDE = {
    message: "지도를 조금 더 확대하거나 다른 곳으로 옮긴 뒤 다시 시도해 주세요",
    retryable: true,
    disablesFeature: false,
    requiresLogin: false,
  } as const;

  beforeEach(() => {
    useAiRouteStore.setState(useAiRouteStore.getInitialState(), true);
  });

  it("정규화 대기를 안내로 종결하면 에러 화면이 되고 대기 플래그가 풀린다 — 다시 누를 수 있다 (§12·D13)", () => {
    store().startNormalize();

    store().abortPending(TOO_WIDE);

    expect(store().status).toBe("error");
    expect(store().errorNotice).toEqual(TOO_WIDE);
    expect(store().normalizePending).toBe(false);
  });

  it("2차 대기도 같은 종결을 쓴다 — 예약이 남아 재발사되지 않는다 (§12·D13)", () => {
    store().startRequest();
    store().startSecondaryRequest("부산 해운대");

    store().abortPending(TOO_WIDE);

    expect(store().status).toBe("error");
    expect(store().secondaryPending).toBe(false);
  });
});
