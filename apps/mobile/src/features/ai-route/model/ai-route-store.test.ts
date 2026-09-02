import { describe, expect, it, vi } from "vitest";
import { ROUTE_POINTS } from "../../../test/route-points";
import { createAiRouteStore } from "./ai-route-store";

/**
 * 템플릿 ② 스토어(모바일 변형) — AI 경로추천 세션 상태 전이 (L9, MSG-556).
 * 웹은 zustand지만 모바일은 미도입이라 `useSyncExternalStore` 싱글턴이다(search-store 관례).
 * 테스트는 팩토리로 격리 인스턴스를 만든다 — 전역 싱글턴을 건드리지 않는다.
 */
const RETRYABLE = {
  message: "잠시 후 다시 시도해 주세요",
  retryable: true,
  disablesFeature: false,
  requiresLogin: false,
} as const;

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

describe("ai-route-store — 요청·결과 상태 전이 (L9)", () => {
  it("초기 상태는 idle이고 입력·결과·선택·에러가 비어 있으며 기능은 켜져 있다", () => {
    const store = createAiRouteStore();

    expect(store.getState()).toEqual({
      text: "",
      status: "idle",
      points: [],
      notice: null,
      selectedOrder: null,
      errorNotice: null,
      featureDisabled: false,
    });
  });

  it("idle→loading(startRequest)→result(succeed) — 입력 문장은 유지된다", () => {
    const store = createAiRouteStore();
    store.setText("서면에서 밥 먹고 저녁 경기까지");

    store.startRequest();
    expect(store.getState().status).toBe("loading");

    store.succeed(ROUTE_POINTS, "부족 안내");
    expect(store.getState().status).toBe("result");
    expect(store.getState().points.map((p) => p.order)).toEqual([1, 2, 3]);
    expect(store.getState().notice).toBe("부족 안내");
    expect(store.getState().text).toBe("서면에서 밥 먹고 저녁 경기까지");
  });

  it("startRequest는 이전 points·notice·selectedOrder·errorNotice를 먼저 비운다 — 로딩 중 잔상 0", () => {
    const store = createAiRouteStore();
    store.succeed(ROUTE_POINTS, "부족 안내");
    store.selectOrder(2);
    store.fail(RETRYABLE);

    store.startRequest();

    expect(store.getState()).toMatchObject({
      status: "loading",
      points: [],
      notice: null,
      selectedOrder: null,
      errorNotice: null,
    });
  });

  it("loading→error(fail) — 안내가 실리고 입력 문장은 유지된다", () => {
    const store = createAiRouteStore();
    store.setText("서면 동선");
    store.startRequest();

    store.fail(RETRYABLE);

    expect(store.getState().status).toBe("error");
    expect(store.getState().errorNotice).toEqual(RETRYABLE);
    expect(store.getState().text).toBe("서면 동선");
  });

  it("fail(requiresLogin)은 에러 없이 idle로 되돌아간다 — 입력 문장 유지 (§1-4)", () => {
    const store = createAiRouteStore();
    store.setText("서면 동선");
    store.startRequest();

    store.fail(LOGIN_REQUIRED);

    expect(store.getState().status).toBe("idle");
    expect(store.getState().errorNotice).toBeNull();
    expect(store.getState().text).toBe("서면 동선");
  });

  it("fail(disablesFeature)은 featureDisabled를 세션 동안 유지한다 — dismissResult·reset에도 남는다 (§1-4)", () => {
    const store = createAiRouteStore();
    store.startRequest();

    store.fail(FEATURE_OFF);
    expect(store.getState().featureDisabled).toBe(true);

    store.dismissResult();
    expect(store.getState().featureDisabled).toBe(true);
    store.reset();
    expect(store.getState().featureDisabled).toBe(true);
  });

  it("resetForSessionEnd()는 featureDisabled까지 지운다 — 로그아웃·계정 삭제 뒤 다음 세션은 서버에 다시 묻는다 (codex 재리뷰 P2)", () => {
    const store = createAiRouteStore();
    store.setText("서면 동선");
    const token = store.startRequest();
    store.fail(FEATURE_OFF);

    store.resetForSessionEnd();

    expect(store.getState()).toMatchObject({
      text: "",
      status: "idle",
      errorNotice: null,
      featureDisabled: false,
    });
    expect(store.isCurrentRequest(token)).toBe(false);
  });

  it("selectOrder(n)이 선택을 바꾸고 null로 해제한다 (웹 L7)", () => {
    const store = createAiRouteStore();
    store.succeed(ROUTE_POINTS, null);

    store.selectOrder(2);
    expect(store.getState().selectedOrder).toBe(2);

    store.selectOrder(null);
    expect(store.getState().selectedOrder).toBeNull();
  });

  it("dismissResult()는 결과·에러·선택을 비우고 idle로 돌아가되 text는 유지한다 (← / 뒤로가기)", () => {
    const store = createAiRouteStore();
    store.setText("서면 동선");
    store.succeed(ROUTE_POINTS, "부족 안내");
    store.selectOrder(1);

    store.dismissResult();

    expect(store.getState()).toMatchObject({
      text: "서면 동선",
      status: "idle",
      points: [],
      notice: null,
      selectedOrder: null,
      errorNotice: null,
    });
  });

  it("reset()은 text까지 비운다", () => {
    const store = createAiRouteStore();
    store.setText("서면 동선");
    store.succeed(ROUTE_POINTS, null);

    store.reset();

    expect(store.getState().text).toBe("");
    expect(store.getState().status).toBe("idle");
    expect(store.getState().points).toEqual([]);
  });

  it("상태가 바뀌면 구독자에게 알리고, 해제된 구독자에게는 알리지 않는다 (useSyncExternalStore 계약)", () => {
    const store = createAiRouteStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getState();

    store.setText("서면");
    expect(listener).toHaveBeenCalledTimes(1);
    // 스냅샷은 불변 교체다 — 같은 참조면 useSyncExternalStore가 리렌더를 건너뛴다
    expect(store.getState()).not.toBe(before);

    unsubscribe();
    store.setText("해운대");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("ai-route-store — 요청 토큰 (MSG-556 리뷰 P2)", () => {
  it("startRequest가 돌려준 토큰은 dismissResult·reset·새 startRequest 뒤에는 현재 요청이 아니다 — 스테일 응답 판별 키", () => {
    const store = createAiRouteStore();

    const first = store.startRequest();
    expect(store.isCurrentRequest(first)).toBe(true);

    store.dismissResult();
    expect(store.isCurrentRequest(first)).toBe(false);

    const second = store.startRequest();
    expect(store.isCurrentRequest(first)).toBe(false);
    expect(store.isCurrentRequest(second)).toBe(true);

    store.reset();
    expect(store.isCurrentRequest(second)).toBe(false);
    // onError는 onMutate가 던졌을 때 context가 undefined다 — 현재 요청으로 보지 않는다
    expect(store.isCurrentRequest(undefined)).toBe(false);
  });
});
