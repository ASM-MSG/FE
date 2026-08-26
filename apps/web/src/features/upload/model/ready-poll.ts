/**
 * 업로드 반영 폴링 (MSG-476 재작업 2회차) — 확정 직후 `processingStatus`를 조회해
 * READY 전이 시점을 잡는다. **블러 통지가 아니라 목록 신선도가 목적이다**: 확정 시점의
 * 격자 쿼리 무효화는 서버가 아직 non-READY라 새 영상을 빼고 응답하므로, READY가 된
 * 순간에 한 번 더 무효화해야 사용자가 새로고침 없이 자기 영상을 본다.
 *
 * 구 블러 파이프라인(`processing-poll` + 워처 + 토스트·확인 모달)은 MSG-476에서 삭제했고,
 * 그중 **재무효화 책임만** 이 모듈로 되살렸다. FAILED·만료는 조용히 멈춘다 — 통지 UI는
 * 부활하지 않는다.
 *
 * 전역 타이머(setTimeout)만 사용 — window·document 무의존(RN 재사용 대상).
 */

/** 첫 조회까지의 선행 지연 — 확정 직후 반영을 앞당긴다 (간격보다 짧게) */
export const READY_POLL_FIRST_DELAY_MS = 5_000;
/** 이후 조회 간격 — 30초 (구 블러 폴링과 동일 부하) */
export const READY_POLL_INTERVAL_MS = 30_000;
/** 폴링 상한 — 15분. 넘기면 포기하고 자연 재조회에 맡긴다 */
export const READY_POLL_TIMEOUT_MS = 15 * 60_000;

/** 상태 전이 — READY/FAILED만 종단, 그 외(UPLOADED·ENCODING 등)는 대기 */
export type ReadyTransition = "ready" | "failed" | "pending";

export const resolveReadyTransition = (
  processingStatus: string,
): ReadyTransition => {
  if (processingStatus === "READY") return "ready";
  if (processingStatus === "FAILED") return "failed";
  return "pending";
};

/** 시작 시각 기준 상한 경과 판정 */
export const isReadyPollExpired = (
  startedAtMs: number,
  nowMs: number,
): boolean => nowMs - startedAtMs >= READY_POLL_TIMEOUT_MS;

export interface ReadyPollHandle {
  /** 폴링 중지 — 이후 조회·콜백 없음 */
  stop: () => void;
}

export interface ReadyPollOptions {
  /** 현재 processingStatus 조회 — 실패(reject)는 전이가 아니며 다음 간격에 재조회한다 */
  fetchStatus: () => Promise<string>;
  /** READY 전이 — 격자 쿼리 재무효화 지점 */
  onReady: () => void;
  /** 종료 통지(READY·FAILED·만료 공통) — 호출자의 중복 폴링 방지용 정리 훅 */
  onStop?: () => void;
  /** 폴링 기산점(확정 시각) */
  startedAtMs: number;
  /** 시각 주입 — 기본 Date.now */
  now?: () => number;
}

/**
 * READY 감지 폴링 시작 — READY/FAILED/만료 시 스스로 멈춘다.
 * 첫 조회는 5초 뒤, 이후 30초 간격.
 */
export const startReadyPoll = (options: ReadyPollOptions): ReadyPollHandle => {
  const now = options.now ?? Date.now;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    options.onStop?.();
  };

  const schedule = (delayMs: number) => {
    if (stopped) return;
    // 기존 예약을 먼저 취소한다 — 타이머 누적 시 간격보다 잦은 조회가 생긴다
    // (구 processing-poll의 PR 리뷰 반영분을 그대로 승계)
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      void check();
    }, delayMs);
  };

  const check = async (): Promise<void> => {
    if (stopped || inFlight) return;
    if (isReadyPollExpired(options.startedAtMs, now())) {
      stop();
      return;
    }
    inFlight = true;
    try {
      const transition = resolveReadyTransition(await options.fetchStatus());
      if (stopped) return;
      if (transition === "ready") {
        options.onReady();
        stop();
        return;
      }
      if (transition === "failed") {
        // 재업로드 유도 UI는 이 티켓에서 폐기됐다 — 조용히 멈춘다
        stop();
        return;
      }
    } catch {
      // 조회 실패(네트워크 등)는 전이가 아니다 — 다음 간격에 계속 조회
    } finally {
      inFlight = false;
    }
    schedule(READY_POLL_INTERVAL_MS);
  };

  schedule(READY_POLL_FIRST_DELAY_MS);

  return { stop };
};
