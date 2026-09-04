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

/** 첫 조회까지의 선행 지연 — 확정 직후 반영을 앞당긴다 */
export const READY_POLL_FIRST_DELAY_MS = 5_000;
/** 간격 상한 — 여기까지만 벌어진다 */
export const READY_POLL_MAX_INTERVAL_MS = 30_000;
/** 폴링 상한 — 15분. 넘기면 포기하고 자연 재조회에 맡긴다 */
export const READY_POLL_TIMEOUT_MS = 15 * 60_000;

/**
 * n번째 조회까지의 대기(ms) — 5·5·10·20초로 벌어지다 30초에서 멈춘다.
 *
 * 고정 간격(구 30초)은 "인코딩이 끝나기 직전에 조회하면 다음 주기를 통째로 기다린다"는
 * 대가가 크다. 인코딩은 대개 초반에 끝나므로 앞을 촘촘히 덮고 뒤로 갈수록 벌린다 —
 * 첫 100초에 5회(고정 30초는 3회)면서 장기 대기 시 부하는 오히려 낮다.
 * 업계 표준은 웹훅/푸시고 폴링은 폴백이라, 폴백답게 초반 체감만 챙긴다 (2026-08-26 결정).
 */
export const readyPollDelayMs = (attempt: number): number =>
  attempt <= 1
    ? READY_POLL_FIRST_DELAY_MS
    : Math.min(
        READY_POLL_FIRST_DELAY_MS * 2 ** (attempt - 2),
        READY_POLL_MAX_INTERVAL_MS,
      );

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
 * 첫 조회는 5초 뒤, 이후 5·10·20초로 벌어지다 30초 상한.
 */
export const startReadyPoll = (options: ReadyPollOptions): ReadyPollHandle => {
  const now = options.now ?? Date.now;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;
  /** 다음 조회가 몇 번째인지 — 대기 스케줄(readyPollDelayMs)의 입력 */
  let attempt = 1;

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
    attempt += 1;
    schedule(readyPollDelayMs(attempt));
  };

  schedule(readyPollDelayMs(attempt));

  return { stop };
};
