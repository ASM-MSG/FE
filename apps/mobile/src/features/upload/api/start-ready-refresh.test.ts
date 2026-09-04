import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthPersistence } from "../../../shared/token-storage";
import { envelopeResponse } from "../../../test/envelope-response";
import { invalidatedIds } from "../../../test/query-key-ids";
import { createAuthStore } from "../../auth/model/auth-store";

/**
 * AC 8·10 (MSG-567): READY 반영 폴링의 세션 경계 — 폴링은 모듈이 소유하는 분리된 타이머라
 * 화면 언마운트를 넘어 살아남는다. 그래서 로그아웃(=세션 만료·계정 삭제 포함, 전부
 * `authStore.logout()` 단일 지점)은 직접 끊어야 이전 사용자의 영상을 다음 사용자 세션으로
 * 조회하지 않는다. 웹 `start-ready-refresh.test.ts` 5케이스 이식 — 모바일 auth 스토어는
 * `subscribe`가 이전 상태를 넘기지 않아 parity 앵커 대신 로컬 단정이다(스펙 A3·A5).
 *
 * auth는 `createAuthStore(메모리 persistence)`를 **주입**한다 — `auth-session`은
 * expo-secure-store를 끌고 와 vitest에서 로드 불가(MSG-426 이력). 대상 모듈은 생성 SDK
 * (env 가드)를 정적으로 끌고 오므로 env를 세운 뒤 동적 import한다(settle-upload-success 관례).
 */
const API_BASE = "https://api.test.local";

const memoryPersistence = (): AuthPersistence => ({
  load: async () => ({ accessToken: null, refreshToken: null, deviceId: null }),
  saveTokens: async () => {},
  saveDeviceId: async () => {},
  clearTokens: async () => {},
});

const PLAYBACK = (processingStatus: string) => ({
  videoId: 7,
  gridId: "grid-9",
  playbackUrl: null,
  processingStatus,
  expiresInSec: 600,
});

type Module = typeof import("./start-ready-refresh");
type PollModule = typeof import("../model/ready-poll");
type KeysModule = typeof import("../../../shared/api/query-options");

let startReadyRefresh: Module["startReadyRefresh"];
let configureReadyRefresh: Module["configureReadyRefresh"];
let __resetReadyRefreshForTest: Module["__resetReadyRefreshForTest"];
let READY_POLL_FIRST_DELAY_MS: PollModule["READY_POLL_FIRST_DELAY_MS"];
let READY_POLL_MAX_INTERVAL_MS: PollModule["READY_POLL_MAX_INTERVAL_MS"];
let getCellQueryKey: KeysModule["getCellQueryKey"];
let auth: ReturnType<typeof createAuthStore>;
let fetchMock: ReturnType<typeof vi.fn>;

const target = { videoId: 7, gridId: "grid-9", event: null };

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  ({ startReadyRefresh, configureReadyRefresh, __resetReadyRefreshForTest } =
    await import("./start-ready-refresh"));
  ({ READY_POLL_FIRST_DELAY_MS, READY_POLL_MAX_INTERVAL_MS } =
    await import("../model/ready-poll"));
  ({ getCellQueryKey } = await import("../../../shared/api/query-options"));
  auth = createAuthStore(memoryPersistence());
  await auth.setTokens({ accessToken: "token-a", refreshToken: "refresh-a" });
  configureReadyRefresh(auth);
  fetchMock = vi.fn(async () => envelopeResponse(PLAYBACK("ENCODING")));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  __resetReadyRefreshForTest();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.useRealTimers();
});

describe("startReadyRefresh — 세션 경계 (AC 8)", () => {
  it("로그아웃하면 진행 중이던 폴링이 멈춘다 — 다음 세션으로 이전 영상을 조회하지 않는다", async () => {
    startReadyRefresh(new QueryClient(), target);

    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    void auth.logout();

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("로그아웃 후 READY가 돼도 다음 사용자의 캐시를 무효화하지 않는다", async () => {
    const queryClient = new QueryClient();
    const cellKey = getCellQueryKey({ path: { gridId: "grid-9" } });
    startReadyRefresh(queryClient, target);

    void auth.logout();
    // 다음 사용자 세션 — 캐시를 새로 채운다
    await auth.setTokens({ accessToken: "token-b", refreshToken: "refresh-b" });
    queryClient.setQueryData(cellKey, { cached: true });
    fetchMock.mockResolvedValue(envelopeResponse(PLAYBACK("READY")));

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS * 3);

    expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(false);
  });

  it("확정 응답이 로그아웃 뒤에 도착하면 폴링을 아예 시작하지 않는다 — 구독은 지나간 전이를 못 본다", async () => {
    void auth.logout();

    startReadyRefresh(new QueryClient(), target);

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("토큰 회전(setTokens, isAuthenticated 불변)에는 폴링이 계속된다 — 정상 재발급을 세션 종료로 오인하지 않는다", async () => {
    const queryClient = new QueryClient();
    const cellKey = getCellQueryKey({ path: { gridId: "grid-9" } });
    queryClient.setQueryData(cellKey, { cached: true });
    startReadyRefresh(queryClient, target);

    // auth-pipeline의 재발급 — 같은 세션에서 토큰만 교체된다
    await auth.setTokens({ accessToken: "token-rotated", refreshToken: null });
    fetchMock.mockResolvedValue(envelopeResponse(PLAYBACK("READY")));

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS);

    expect(fetchMock).toHaveBeenCalled();
    expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(true);
  });

  it("같은 영상에 폴링을 두 번 걸지 않는다 — 중복 확정 방어(영상당 1폴)", async () => {
    const queryClient = new QueryClient();
    startReadyRefresh(queryClient, target);
    startReadyRefresh(queryClient, target);

    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("auth 미배선(테스트·스토리북)이면 폴링을 시작하지 않는다 — 타이머 누수 없음 (A2)", async () => {
    __resetReadyRefreshForTest();

    startReadyRefresh(new QueryClient(), target);

    await vi.advanceTimersByTimeAsync(READY_POLL_MAX_INTERVAL_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("startReadyRefresh — READY 전이 재무효화 (AC 10)", () => {
  it("READY 응답에 확정 시점과 같은 집합(단건 재생·격자·도감 동 목록)을 같은 인자로 무효화한다", async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(envelopeResponse(PLAYBACK("READY")));

    startReadyRefresh(queryClient, target);
    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);

    const ids = invalidatedIds(spy.mock.calls);
    expect(ids).toEqual(
      expect.arrayContaining([
        "getPlayback",
        "getCell",
        "getRegionVideos",
        "getUploadHistory",
      ]),
    );
    expect(ids).not.toContain("getLocationVideos");
  });

  it("행사 귀속 확정은 READY에서도 그 위치 정확 키를 다시 무효화한다", async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(envelopeResponse(PLAYBACK("READY")));

    startReadyRefresh(queryClient, {
      ...target,
      event: { occurrenceId: 5, locationId: 11 },
    });
    await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);

    const ids = invalidatedIds(spy.mock.calls);
    expect(ids).toContain("getLocationVideos");
    expect(ids).toContain("getLocations");
  });
});
