import type { QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getPlayback } from "@/shared/api/generated/sdk.gen";
import { type ReadyPollHandle, startReadyPoll } from "../model/ready-poll";
import { invalidateUploadSurfaces } from "./invalidate-upload-surfaces";

/**
 * 확정한 영상이 READY가 되는 순간 업로드가 바꾼 화면을 한 번 더 무효화한다
 * (MSG-476 재작업 2회차).
 *
 * **왜 필요한가**: 확정 시점의 무효화가 부르는 재조회는 서버가 아직 non-READY라 새 영상을
 * 빼고 응답한다. 구 블러 워처가 READY 전이에서 재무효화해 이 구멍을 메우고 있었는데,
 * 블러 파이프라인을 지우면서 그 책임까지 사라져 **업로드한 영상이 새로고침 전까지 목록에
 * 안 보이는 회귀**가 생겼다(QA 실측 2026-08-26: 88초 무변화 → 새로고침하니 7 → 8개).
 *
 * 통지 UI는 부활하지 않는다 — READY면 조용히 무효화만 하고, FAILED·만료면 조용히 멈춘다.
 *
 * **세션 경계**: 폴링은 컴포넌트가 아니라 모듈이 소유하는 분리된 타이머라 화면 언마운트를
 * 넘어 산다(모달을 닫아도 계속 도는 것이 목적이다). 그래서 세션은 직접 끊어야 한다 —
 * 안 그러면 이전 사용자의 영상을 **다음 사용자의 세션 토큰으로** 조회하고 그 캐시를
 * 무효화한다 (codex 리뷰 P2).
 *
 * 판정 기준은 "로그아웃 이벤트"가 아니라 **시작 시점에 잡아둔 액세스 토큰**이다. 확정
 * 요청이 날아가는 동안 로그아웃이 끝나면 `onSuccess`는 전이 이후에 도착해 구독이 그
 * 전이를 못 보기 때문이다(codex 2차 리뷰). 토큰이 없으면 아예 시작하지 않고, 토큰이
 * 바뀌면(재로그인·타 계정) 전부 멈춘다.
 */
const activePolls = new Map<number, ReadyPollHandle>();

/** 현재 폴링들이 속한 세션의 액세스 토큰 — 이 값이 바뀌면 전부 멈춘다 */
let pollSessionToken: string | null = null;

/** 세션 변화 감시 구독 — 첫 폴링 시작 시 1회만 건다 */
let unsubscribeAuth: (() => void) | null = null;

const stopAll = (): void => {
  for (const handle of activePolls.values()) handle.stop();
  activePolls.clear();
  pollSessionToken = null;
};

const watchSession = (): void => {
  if (unsubscribeAuth !== null) return;
  unsubscribeAuth = useAuthStore.subscribe((state) => {
    if (pollSessionToken !== null && state.accessToken !== pollSessionToken) {
      stopAll();
    }
  });
};

export const startReadyRefresh = (
  queryClient: QueryClient,
  videoId: number,
  gridId: string | null,
): void => {
  const token = useAuthStore.getState().accessToken;
  // 세션이 이미 끝났다 — 확정 응답이 로그아웃 뒤에 도착한 경우 (codex 2차 리뷰)
  if (token === null) return;
  // 확정 도중 계정이 바뀌었다면 이전 세션 폴링을 먼저 정리한다
  if (pollSessionToken !== null && pollSessionToken !== token) stopAll();
  pollSessionToken = token;

  if (activePolls.has(videoId)) return;
  watchSession();

  const handle = startReadyPoll({
    startedAtMs: Date.now(),
    fetchStatus: async () => {
      const { data } = await getPlayback({
        path: { videoId },
        throwOnError: true,
      });
      return unwrapEnvelope(data).processingStatus;
    },
    onReady: () => {
      // 확정 시점과 **같은 집합**을 다시 무효화한다 — 그때는 서버가 non-READY라
      // 새 영상을 빼고 응답했고, 이제야 실제 데이터가 있다
      invalidateUploadSurfaces(queryClient, { videoId, gridId });
    },
    onStop: () => {
      activePolls.delete(videoId);
    },
  });
  activePolls.set(videoId, handle);
};

/** 테스트 전용 — 모듈 수준 폴링 등록과 세션 구독을 비운다 */
export const __resetReadyRefreshForTest = (): void => {
  stopAll();
  unsubscribeAuth?.();
  unsubscribeAuth = null;
};
