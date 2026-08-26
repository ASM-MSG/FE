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
 * 판정은 **두 겹**이다 (codex 2·3차 리뷰):
 * - **시작 가드**: 시작 시점에 이미 비로그인이면 아예 걸지 않는다. 확정 요청이 날아가는
 *   동안 로그아웃이 끝나면 `onSuccess`가 전이 이후에 도착해 구독이 그 전이를 못 본다.
 * - **로그아웃 구독**: `isAuthenticated`가 true → false로 떨어질 때만 멈춘다.
 *
 * 액세스 토큰 문자열 비교는 쓸 수 없다 — 401 재발급(`setAccessToken`)이 **같은 세션에서**
 * 토큰을 갈아끼우므로, 토큰 동등성으로 판정하면 정상 갱신을 계정 변경으로 오인해
 * 인코딩 중인 폴링을 죽인다.
 *
 * **알려진 한계 — 새로고침은 폴링을 잇지 않는다** (수용 결정, codex 4차 리뷰): 타이머가
 * JS 컨텍스트 수명에 묶여 있어 새로고침·탭 재개장이면 사라진다. 구 `pendingVideoStorage`가
 * 이 재진입을 덮었지만 MSG-476에서 삭제했고, 되살리지 않기로 했다 — 새로고침 자체가
 * 캐시를 비워 즉시 신선 조회를 부르고, 탭 복귀 시 `refetchOnWindowFocus`(전역 기본 on)가
 * 다시 덮는다. 남는 틈은 "인코딩 중 새로고침한 뒤 그 페이지에 계속 머무는 동안"뿐이다.
 * 근본 해소는 FCM 푸시 승격(후속 티켓) — 그때는 폴링 자체가 폴백이 된다.
 */
const activePolls = new Map<number, ReadyPollHandle>();

/** 로그아웃 감시 구독 — 첫 폴링 시작 시 1회만 건다 */
let unsubscribeAuth: (() => void) | null = null;

const stopAll = (): void => {
  for (const handle of activePolls.values()) handle.stop();
  activePolls.clear();
};

const watchSession = (): void => {
  if (unsubscribeAuth !== null) return;
  unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
    // 토큰 회전(401 재발급)은 isAuthenticated를 건드리지 않는다 — 로그아웃만 잡는다
    if (previous.isAuthenticated && !state.isAuthenticated) stopAll();
  });
};

export const startReadyRefresh = (
  queryClient: QueryClient,
  videoId: number,
  gridId: string | null,
): void => {
  // 세션이 이미 끝났다 — 확정 응답이 로그아웃 뒤에 도착한 경우 (codex 2차 리뷰)
  if (!useAuthStore.getState().isAuthenticated) return;
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
