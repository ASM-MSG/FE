import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ROUTE_POINTS } from "../../../test/route-points";
import { aiRouteStore } from "../../ai-route/model/ai-route-store";
import { endLocalSession } from "./end-local-session";

/**
 * 템플릿 ①(순수 로직) — 로그아웃·계정 삭제가 공유하는 로컬 정리 꼬리 (MSG-556 리뷰 P1).
 * 인증 스토어는 주입 스파이, 쿼리 캐시는 실제 QueryClient, AI 경로 스토어는 앱 싱글턴
 * (이 파일이 유일한 소비자라 격리는 vitest 파일 단위 모듈 격리로 충분하다).
 */
describe("endLocalSession — 로그아웃·계정 삭제의 로컬 정리", () => {
  it("인증 종료와 같은 tick에 쿼리 캐시와 AI 경로 스토어(문장·결과)를 비운다 — 다음 사용자가 이전 사용자의 경로를 보지 않는다", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["stale-user-data"], { nickname: "이전 사용자" });
    aiRouteStore.setText("서면에서 밥 먹고 저녁 경기까지");
    const token = aiRouteStore.startRequest();
    aiRouteStore.succeed(ROUTE_POINTS, null);
    let storageCleared = false;
    const clearSession = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            storageCleared = true;
            resolve();
          }, 0);
        }),
    );

    const pending = endLocalSession(clearSession, queryClient);

    // 저장소 정리(await)를 기다리지 않고 같은 tick에 비운다 — 이전 사용자 데이터 렌더 창 0
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(storageCleared).toBe(false);
    expect(queryClient.getQueryData(["stale-user-data"])).toBeUndefined();
    expect(aiRouteStore.getState()).toMatchObject({
      text: "",
      status: "idle",
      points: [],
    });
    // 로그아웃 전에 나간 추천 요청의 응답은 게시되지 않는다
    expect(aiRouteStore.isCurrentRequest(token)).toBe(false);

    await pending;
    expect(storageCleared).toBe(true);
  });

  it("14503으로 꺼진 featureDisabled도 세션 종료와 함께 풀린다 — 다음 세션의 버튼이 영구 비활성으로 남지 않는다 (codex 재리뷰 P2)", async () => {
    aiRouteStore.startRequest();
    aiRouteStore.fail({
      message: "지금은 경로 추천을 쓸 수 없어요",
      retryable: false,
      disablesFeature: true,
      requiresLogin: false,
    });
    expect(aiRouteStore.getState().featureDisabled).toBe(true);

    await endLocalSession(() => Promise.resolve(), new QueryClient());

    expect(aiRouteStore.getState().featureDisabled).toBe(false);
  });
});
