import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";
import { ROUTE_POINTS } from "../../../test/route-points";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 추천 1회 요청 배선 (L10, MSG-556).
 * RN 렌더 인프라가 없어 훅 대신 **훅이 그대로 넘기는 옵션 객체**를 MutationObserver로
 * 구동한다(MSG-426 구조). 스토어는 격리 인스턴스를, 로그인 이동은 스파이를 주입한다 —
 * expo-router가 딸려 오는 `shared/navigation`을 테스트가 로드하지 않는다.
 */
const API_BASE = "https://api.test.local";

const BODY = {
  text: "서면에서 밥 먹고 저녁 경기까지 동선 짜 줘",
  viewport: {
    minLat: 35.1521,
    minLng: 129.0537,
    maxLat: 35.1662,
    maxLng: 129.0712,
  },
};

const loadRecommend = async (options: { secondary?: boolean } = {}) => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  // 앱 부트스트랩과 같은 에러 정규화 — 실패 바디가 `ApiError`로 매핑돼야 §1-4 표가 성립한다
  const { registerApiErrorInterceptor } =
    await import("../../../shared/api/error-interceptor");
  registerApiErrorInterceptor();
  const { createAiRouteStore } = await import("../model/ai-route-store");
  const { recommendMutationOptions } =
    await import("./route-recommend-mutation");
  const store = createAiRouteStore();
  const onLoginRequired = vi.fn();
  const onAutoMove = vi.fn();
  const observer = new MutationObserver(
    new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    recommendMutationOptions({
      store,
      onLoginRequired,
      onAutoMove,
      secondary: options.secondary,
    }),
  );
  return { store, observer, onLoginRequired, onAutoMove };
};

/** 언급 지역 신호가 실린 1차 응답 페이로드 (L10) */
const MENTIONED_AREA = {
  name: "부산 해운대",
  centerLat: 35.1618,
  centerLng: 129.1618,
  minLat: 35.1523,
  minLng: 129.1521,
  maxLat: 35.1712,
  maxLng: 129.1712,
  kind: "MOVE",
};

const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: Array<{ method: string; pathname: string; body: unknown }> =
    [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      received.push({
        method: input.method,
        pathname: new URL(input.url).pathname,
        body: await input.clone().json(),
      });
      return route(input);
    }),
  );
  return received;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("recommendMutationOptions — 추천 1회 요청 배선 (L10)", () => {
  it("본문을 POST /api/routes/recommend로 보내고 응답 봉투를 벗겨 points·notice를 succeed로 싣는다", async () => {
    const { store, observer } = await loadRecommend();
    const received = stubFetch(() =>
      envelopeResponse({
        points: ROUTE_POINTS,
        notice: "부족",
        mentionedArea: null,
      }),
    );

    await observer.mutate(BODY);

    expect(received).toEqual([
      { method: "POST", pathname: "/api/routes/recommend", body: BODY },
    ]);
    expect(store.getState().status).toBe("result");
    expect(store.getState().points.map((p) => p.order)).toEqual([1, 2, 3]);
    expect(store.getState().notice).toBe("부족");
  });

  it("onMutate가 startRequest를 부른다 — 요청이 나가는 시점에 이미 loading이고 이전 결과가 비어 있다", async () => {
    const { store, observer } = await loadRecommend();
    store.succeed(ROUTE_POINTS, null);
    store.selectOrder(2);
    const seenAtFetch: {
      status: string;
      points: number;
      selected: number | null;
    }[] = [];
    stubFetch(() => {
      const state = store.getState();
      seenAtFetch.push({
        status: state.status,
        points: state.points.length,
        selected: state.selectedOrder,
      });
      return envelopeResponse({
        points: [ROUTE_POINTS[0]],
        notice: null,
        mentionedArea: null,
      });
    });

    await observer.mutate(BODY);

    expect(seenAtFetch).toEqual([
      { status: "loading", points: 0, selected: null },
    ]);
    expect(store.getState().points.map((p) => p.order)).toEqual([1]);
  });

  it("1차 응답에 mentionedArea가 실리면 결과를 게시하지 않고 2차를 예약한다 — succeed 미호출·로딩 유지 (L10, MSG-556 확장점 소비)", async () => {
    const { store, observer, onAutoMove } = await loadRecommend();
    stubFetch(() =>
      envelopeResponse({
        points: ROUTE_POINTS,
        notice: null,
        mentionedArea: MENTIONED_AREA,
      }),
    );

    await observer.mutate(BODY);

    expect(store.getState().status).toBe("loading");
    expect(store.getState().points).toHaveLength(0);
    expect(store.getState()).toMatchObject({
      autoMoved: true,
      movedAreaName: "부산 해운대",
      movedCenter: { lat: 35.1618, lng: 129.1618 },
      secondaryPending: true,
    });
    expect(onAutoMove).toHaveBeenCalledTimes(1);
    expect(onAutoMove).toHaveBeenCalledWith(
      expect.objectContaining({
        center: { lat: 35.1618, lng: 129.1618 },
        areaName: "부산 해운대",
      }),
    );
  });

  it("이미 자동 이동한 사이클(2차 응답)에서는 mentionedArea가 또 실려 와도 결과를 게시한다 — 무한 루프 차단 (L10)", async () => {
    const { store, observer, onAutoMove } = await loadRecommend({
      secondary: true,
    });
    stubFetch(() =>
      envelopeResponse({
        points: ROUTE_POINTS,
        notice: null,
        mentionedArea: MENTIONED_AREA,
      }),
    );
    store.startRequest();
    store.startSecondaryRequest("부산 해운대", { lat: 35.1618, lng: 129.1618 });
    onAutoMove.mockClear();

    await observer.mutate(BODY);

    expect(store.getState().status).toBe("result");
    expect(store.getState().points).toHaveLength(3);
    expect(onAutoMove).not.toHaveBeenCalled();
  });

  it("실패는 routeErrorNotice 매핑으로 fail에 실린다 — 입력 문장은 유지된다 (§1-4 14400)", async () => {
    const { store, observer } = await loadRecommend();
    store.setText(BODY.text);
    stubFetch(() => errorEnvelope(14400, "뷰포트가 너무 넓습니다", 400));

    await expect(observer.mutate(BODY)).rejects.toThrow();

    expect(store.getState().status).toBe("error");
    expect(store.getState().errorNotice?.message).toBe(
      "지도를 조금 더 확대하거나 다른 곳으로 옮긴 뒤 다시 시도해 주세요",
    );
    expect(store.getState().text).toBe(BODY.text);
  });

  it("14503은 재시도 없이 기능을 세션 동안 끈다 (§1-4)", async () => {
    const { store, observer } = await loadRecommend();
    stubFetch(() => errorEnvelope(14503, "기능 꺼짐", 503));

    await expect(observer.mutate(BODY)).rejects.toThrow();

    expect(store.getState().status).toBe("error");
    expect(store.getState().errorNotice?.retryable).toBe(false);
    expect(store.getState().featureDisabled).toBe(true);
  });

  it("401(2403)은 onLoginRequired를 부르고 스토어는 에러 없이 idle로 돌아간다 — 입력 문장 유지 (§1-4)", async () => {
    const { store, observer, onLoginRequired } = await loadRecommend();
    store.setText(BODY.text);
    stubFetch(() => errorEnvelope(2403, "로그인 필요", 401));

    await expect(observer.mutate(BODY)).rejects.toThrow();

    expect(onLoginRequired).toHaveBeenCalledTimes(1);
    expect(store.getState().status).toBe("idle");
    expect(store.getState().errorNotice).toBeNull();
    expect(store.getState().text).toBe(BODY.text);
  });

  it("네트워크 실패(응답 없음)는 네트워크 안내로 실리고 로그인 이동은 없다 (§1-4)", async () => {
    const { store, observer, onLoginRequired } = await loadRecommend();
    stubFetch(() => {
      throw new TypeError("Network request failed");
    });

    await expect(observer.mutate(BODY)).rejects.toThrow();

    expect(store.getState().errorNotice?.message).toBe(
      "네트워크 상태를 확인하고 다시 시도해 주세요",
    );
    expect(onLoginRequired).not.toHaveBeenCalled();
  });
});

describe("recommendMutationOptions — 스테일 응답 무시 (MSG-556 리뷰 P2)", () => {
  it("로딩 중 dismissResult()로 대기로 돌아간 뒤 도착한 응답은 게시되지 않는다 — idle 유지", async () => {
    const { store, observer } = await loadRecommend();
    let respond!: () => void;
    stubFetch(
      () =>
        new Promise<Response>((resolve) => {
          respond = () =>
            resolve(
              envelopeResponse({
                points: ROUTE_POINTS,
                notice: null,
                mentionedArea: null,
              }),
            );
        }),
    );

    const pending = observer.mutate(BODY);
    await vi.waitFor(() => expect(respond).toBeDefined()); // 요청이 나간 뒤
    expect(store.getState().status).toBe("loading");
    store.dismissResult(); // ← / Android 뒤로가기
    respond();
    await pending;

    expect(store.getState().status).toBe("idle");
    expect(store.getState().points).toEqual([]);
  });

  it("두 번 제출해 이전 응답이 나중에 도착해도 최신 요청의 결과만 남는다", async () => {
    const { store, observer } = await loadRecommend();
    const responders: Array<() => void> = [];
    stubFetch(
      () =>
        new Promise<Response>((resolve) => {
          const count = responders.length + 1; // n번째 요청 = n곳
          responders.push(() =>
            resolve(
              envelopeResponse({
                points: ROUTE_POINTS.slice(0, count),
                notice: null,
                mentionedArea: null,
              }),
            ),
          );
        }),
    );

    const first = observer.mutate(BODY);
    const second = observer.mutate(BODY);
    await vi.waitFor(() => expect(responders).toHaveLength(2));
    responders[1]!(); // 최신(2번째) 응답 = 2곳
    await second;
    responders[0]!(); // 이전(1번째) 응답 = 1곳 — 늦게 도착
    await first.catch(() => undefined);

    expect(store.getState().status).toBe("result");
    expect(store.getState().points).toHaveLength(2);
  });
});

describe("recommendMutationOptions — 2차 자동 재요청 인스턴스 (L10)", () => {
  it("secondary 인스턴스의 onMutate는 markSecondarySent를 부르고 startRequest를 부르지 않는다 — autoMoved·예약 토큰이 보존된다", async () => {
    const { store, observer } = await loadRecommend({ secondary: true });
    stubFetch(() =>
      envelopeResponse({
        points: ROUTE_POINTS,
        notice: null,
        mentionedArea: null,
      }),
    );
    const token = store.startRequest();
    store.startSecondaryRequest("부산 해운대", { lat: 35.1618, lng: 129.1618 });

    await observer.mutate({ ...BODY, origin: { lat: 35.16, lng: 129.16 } });

    expect(store.isCurrentRequest(token)).toBe(true);
    expect(store.getState()).toMatchObject({
      status: "result",
      autoMoved: true,
      secondaryPending: false,
      // body에 origin이 실려 있었으므로 결과 화면 버튼은 "현재 위치에서 다시 짜기"
      originSent: true,
    });
    expect(store.getState().points).toHaveLength(3);
  });

  it("origin 없는 2차 body는 originSent를 false로 되돌린다 — 이동 후 뷰포트 재판정 결과", async () => {
    const { store, observer } = await loadRecommend({ secondary: true });
    stubFetch(() =>
      envelopeResponse({
        points: ROUTE_POINTS,
        notice: null,
        mentionedArea: null,
      }),
    );
    store.startRequest(true);
    store.startSecondaryRequest("부산 해운대", { lat: 35.1618, lng: 129.1618 });

    await observer.mutate(BODY);

    expect(store.getState().originSent).toBe(false);
  });

  it("2차가 401(2403)을 받으면 1차와 같은 onLoginRequired가 불린다 — 지연된 2차 사이의 세션 만료 (P1)", async () => {
    const { store, observer, onLoginRequired } = await loadRecommend({
      secondary: true,
    });
    stubFetch(() => errorEnvelope(2403, "로그인 필요", 401));
    store.startRequest();
    store.startSecondaryRequest("부산 해운대", { lat: 35.1618, lng: 129.1618 });

    await expect(observer.mutate(BODY)).rejects.toThrow();

    expect(onLoginRequired).toHaveBeenCalledTimes(1);
    expect(store.getState().status).toBe("idle");
  });
});
