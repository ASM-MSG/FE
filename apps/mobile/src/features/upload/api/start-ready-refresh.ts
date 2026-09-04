import type { QueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getPlayback } from "../../../shared/api/sdk";
import type { AuthStore } from "../../auth/model/auth-store";
import { type ReadyPollHandle, startReadyPoll } from "../model/ready-poll";
import {
  invalidateUploadSurfaces,
  type UploadSurfaceTarget,
} from "./invalidate-upload-surfaces";

/**
 * 확정한 영상이 READY가 되는 순간 업로드가 바꾼 화면을 한 번 더 무효화한다
 * (MSG-567 — 웹 `start-ready-refresh.ts` 이식).
 *
 * **왜 필요한가**: 확정 시점의 무효화가 부르는 재조회는 서버가 아직 non-READY라 새 영상을
 * 빼고 응답한다. 구 블러 워처(`use-processing-watcher`)가 READY 전이에서 재무효화해 이 구멍을
 * 메우고 있었는데, 블러 파이프라인을 지우면서 **재무효화 책임만** 이 모듈로 되살렸다.
 * 통지 UI는 부활하지 않는다 — READY면 조용히 무효화만 하고, FAILED·만료면 조용히 멈춘다.
 *
 * **세션 경계**: 폴링은 컴포넌트가 아니라 모듈이 소유하는 분리된 타이머라 화면 언마운트를
 * 넘어 산다(완료 화면을 닫아도 계속 도는 것이 목적이다). 그래서 세션은 직접 끊어야 한다 —
 * 안 그러면 이전 사용자의 영상을 **다음 사용자의 세션 토큰으로** 조회하고 그 캐시를 무효화한다.
 * 판정은 두 겹이다: **시작 가드**(시작 시점에 이미 비로그인이면 걸지 않는다 — 확정 요청이
 * 날아가는 동안 로그아웃이 끝나면 구독이 그 전이를 못 본다) + **로그아웃 구독**
 * (`isAuthenticated` true → false에만 전량 중지). 토큰 회전(`setTokens`)은 `isAuthenticated`를
 * 건드리지 않으므로 정상 재발급을 세션 종료로 오인하지 않는다.
 *
 * **웹과의 편차 (스펙 A2·A5·A6)**: auth 스토어는 `configureReadyRefresh`로 부팅 시 **주입**한다 —
 * `auth-session`을 import하면 expo-secure-store가 vitest 파싱 단계에서 죽는다
 * (`delete-account-mutation`·`end-local-session` 관례). 미배선(테스트·스토리북)이면 시작 가드가
 * 폴을 걸지 않는다. 모바일 `subscribe`는 이전 상태를 넘기지 않아 직전 `isAuthenticated`를
 * 클로저에 보관해 전이를 판정한다. `restart`(교체)·포그라운드 복귀 즉시 조회는 이식하지 않았다 —
 * 백그라운드에서 미뤄진 타이머는 복귀 시 발화하고 15분 만료는 절대 시각 판정이라 무해.
 *
 * **알려진 한계 — 앱 재시작은 폴링을 잇지 않는다** (웹 codex 4차 수용 미러): 구
 * `pending-video-storage`가 이 재진입을 덮었지만 삭제했다 — 재시작 자체가 캐시를 비워 신선
 * 조회를 부른다. 근본 해소는 FCM 푸시 `data` 계약(후속).
 */
type ReadyRefreshAuth = Pick<AuthStore, "getState" | "subscribe">;

const activePolls = new Map<number, ReadyPollHandle>();
let auth: ReadyRefreshAuth | null = null;
let unsubscribeAuth: (() => void) | null = null;

const stopAll = (): void => {
  for (const handle of activePolls.values()) handle.stop();
  activePolls.clear();
};

/** 부팅 배선 — `_layout.tsx`가 `bootstrapAuth()` 옆에서 1회 부른다 */
export const configureReadyRefresh = (store: ReadyRefreshAuth): void => {
  unsubscribeAuth?.();
  auth = store;
  let wasAuthenticated = store.getState().isAuthenticated;
  unsubscribeAuth = store.subscribe(() => {
    const { isAuthenticated } = store.getState();
    if (wasAuthenticated && !isAuthenticated) stopAll();
    wasAuthenticated = isAuthenticated;
  });
};

export const startReadyRefresh = (
  queryClient: QueryClient,
  target: UploadSurfaceTarget,
): void => {
  // 미배선이거나 세션이 이미 끝났다 — 확정 응답이 로그아웃 뒤에 도착한 경우
  if (auth === null || !auth.getState().isAuthenticated) return;
  if (activePolls.has(target.videoId)) return;

  const handle = startReadyPoll({
    startedAtMs: Date.now(),
    fetchStatus: async () => {
      const { data } = await getPlayback({
        path: { videoId: target.videoId },
        throwOnError: true,
      });
      return unwrapEnvelope(data).processingStatus;
    },
    // 확정 시점과 **같은 집합**을 다시 무효화한다 — 그때는 서버가 non-READY라
    // 새 영상을 빼고 응답했고, 이제야 실제 데이터가 있다
    onReady: () => invalidateUploadSurfaces(queryClient, target),
    onStop: () => {
      activePolls.delete(target.videoId);
    },
  });
  activePolls.set(target.videoId, handle);
};

/** 테스트 전용 — 모듈 수준 폴링 등록·auth 배선·세션 구독을 비운다 */
export const __resetReadyRefreshForTest = (): void => {
  stopAll();
  unsubscribeAuth?.();
  unsubscribeAuth = null;
  auth = null;
};
