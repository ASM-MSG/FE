import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { ROUTE_POINTS } from "@/test/route-points";
import { stubFetch } from "@/test/stub-fetch";
import { useAiRouteStore } from "../model/ai-route-store";
import { useRouteRecommend } from "./use-route-recommend";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const BODY = {
  text: "서면에서 밥 먹고 저녁 경기까지 동선 짜 줘",
  viewport: {
    minLat: 35.1521,
    minLng: 129.0537,
    maxLat: 35.1662,
    maxLng: 129.0712,
  },
};

/** 훅 마운트 → 1회 요청 — 세 시나리오가 공유하는 진입 동작 */
const mutateRecommend = (
  callbacks?: Parameters<typeof useRouteRecommend>[0],
) => {
  const { result } = renderHook(() => useRouteRecommend(callbacks), {
    wrapper,
  });
  result.current.mutate(BODY);
};

describe("useRouteRecommend — 추천 1회 요청 배선 (L5·L7 배선)", () => {
  beforeEach(() => {
    useAiRouteStore.setState(useAiRouteStore.getInitialState(), true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("응답 봉투를 벗겨 지점과 부족 안내를 스토어에 싣는다 (§4-3)", async () => {
    const received = stubFetch(() =>
      envelopeResponse({
        points: ROUTE_POINTS,
        notice: null,
        mentionedArea: null,
      }),
    );
    mutateRecommend();

    await waitFor(() =>
      expect(useAiRouteStore.getState().status).toBe("result"),
    );
    expect(useAiRouteStore.getState().points.map((p) => p.order)).toEqual([
      1, 2, 3,
    ]);
    expect(received[0].body).toEqual(BODY);
  });

  it("실패는 developCode 매핑 안내로 스토어에 실린다 — 입력 문장은 유지된다 (§1-4)", async () => {
    stubFetch(() => errorEnvelope(14400, "뷰포트가 너무 넓습니다", 400));
    useAiRouteStore.getState().setText(BODY.text);
    const { result } = renderHook(() => useRouteRecommend(), { wrapper });

    result.current.mutate(BODY);

    await waitFor(() =>
      expect(useAiRouteStore.getState().status).toBe("error"),
    );
    expect(useAiRouteStore.getState().errorNotice?.message).toBe(
      "지도를 조금 더 확대하거나 다른 곳으로 옮긴 뒤 다시 시도해 주세요",
    );
    expect(useAiRouteStore.getState().text).toBe(BODY.text);
  });

  it("401(2403)이면 입력 대기로 되돌아가고 로그인 콜백이 호출된다 (§1-3)", async () => {
    stubFetch(() => errorEnvelope(2403, "인증이 필요합니다", 401));
    const onLoginRequired = vi.fn();
    const { result } = renderHook(
      () => useRouteRecommend({ onLoginRequired }),
      {
        wrapper,
      },
    );

    result.current.mutate(BODY);

    await waitFor(() => expect(onLoginRequired).toHaveBeenCalledTimes(1));
    expect(useAiRouteStore.getState().status).toBe("idle");
    expect(useAiRouteStore.getState().errorNotice).toBeNull();
  });
});
