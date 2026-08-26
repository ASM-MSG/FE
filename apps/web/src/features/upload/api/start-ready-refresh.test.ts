import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { getCellQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { envelopeResponse } from "@/test/envelope-response";
import {
  READY_POLL_FIRST_DELAY_MS,
  READY_POLL_MAX_INTERVAL_MS,
} from "../model/ready-poll";
import {
  __resetReadyRefreshForTest,
  startReadyRefresh,
} from "./start-ready-refresh";

/**
 * READY 반영 폴링의 세션 경계 (codex 리뷰 P2) — 폴링은 모듈이 소유하는 분리된 타이머라
 * 화면 언마운트를 넘어 살아남는다(모달을 닫아도 계속 도는 것이 목적). 그래서 로그아웃은
 * 직접 끊어야 이전 사용자의 영상을 다음 사용자 세션으로 조회하지 않는다.
 */

const PLAYBACK = (processingStatus: string) => ({
  videoId: 7,
  gridId: "grid-9",
  playbackUrl: null,
  processingStatus,
  expiresInSec: 600,
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  __resetReadyRefreshForTest();
  useAuthStore.setState({ accessToken: "token-a", isAuthenticated: true });
  fetchMock = vi.fn(async () => envelopeResponse(PLAYBACK("ENCODING")));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  __resetReadyRefreshForTest();
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("startReadyRefresh — 세션 경계", () => {
  it("로그아웃하면 진행 중이던 폴링이 멈춘다 — 다음 세션으로 이전 영상을 조회하지 않는다", async () => {
    startReadyRefresh(new QueryClient(), 7, "grid-9");

    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    useAuthStore.getState().logout();

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("로그아웃 후 READY가 돼도 다음 사용자의 캐시를 무효화하지 않는다", async () => {
    const queryClient = new QueryClient();
    const cellKey = getCellQueryKey({ path: { gridId: "grid-9" } });
    startReadyRefresh(queryClient, 7, "grid-9");

    useAuthStore.getState().logout();
    // 다음 사용자 세션 — 캐시를 새로 채운다
    useAuthStore.setState({ accessToken: "token-b", isAuthenticated: true });
    queryClient.setQueryData(cellKey, { cached: true });
    fetchMock.mockResolvedValue(envelopeResponse(PLAYBACK("READY")));

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS * 3);

    expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(false);
  });

  it("확정 응답이 로그아웃 뒤에 도착하면 폴링을 아예 시작하지 않는다 — 구독은 지나간 전이를 못 본다", async () => {
    // 업로드가 날아가는 동안 로그아웃이 끝난 상황 (codex 2차 리뷰)
    useAuthStore.getState().logout();

    startReadyRefresh(new QueryClient(), 7, "grid-9");

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401 재발급으로 액세스 토큰이 갈려도 폴링은 계속된다 — 정상 회전을 세션 종료로 오인하지 않는다 (codex 3차 리뷰)", async () => {
    const queryClient = new QueryClient();
    const cellKey = getCellQueryKey({ path: { gridId: "grid-9" } });
    queryClient.setQueryData(cellKey, { cached: true });
    startReadyRefresh(queryClient, 7, "grid-9");

    // auth-pipeline의 재발급 — 같은 세션에서 토큰만 교체된다
    useAuthStore.getState().setAccessToken("token-rotated");
    fetchMock.mockResolvedValue(envelopeResponse(PLAYBACK("READY")));

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalled();
    expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(true);
  });

  it("같은 영상에 폴링을 두 번 걸지 않는다 — 중복 확정·재마운트 방어", async () => {
    const queryClient = new QueryClient();
    startReadyRefresh(queryClient, 7, "grid-9");
    startReadyRefresh(queryClient, 7, "grid-9");

    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
