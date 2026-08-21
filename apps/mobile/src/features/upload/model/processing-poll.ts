/**
 * 블러 처리 폴링 — 웹 `features/upload/model/processing-poll.ts`의 모바일 복제본
 * (MSG-424 포팅, `processing-poll.parity.test.ts`가 동등성을 고정한다).
 *
 * MSG-424는 **모델만** 포팅했고(D9), 확정 이후의 대기·워처·완료 통지는 MSG-429가 이어받아
 * `pending-video-storage`·`processing-store`·`api/use-processing-watcher`로 붙였다.
 * 이 파일은 그때 무수정으로 재사용됐다 — 판정 규칙(간격·상한·전이)의 정본은 여전히 여기다.
 */

/** 폴링 간격 — 30초 (티켓 19 확정) */
export const PROCESSING_POLL_INTERVAL_MS = 30_000;
/** 폴링 상한 — 15분 (티켓 19 확정) */
export const PROCESSING_POLL_TIMEOUT_MS = 15 * 60_000;

/** 상태 전이 — READY/FAILED만 전이, 그 외(UPLOADED·ENCODING·BLURRING)는 대기 */
export type ProcessingTransition = "ready" | "failed" | "pending";

export const resolveProcessingTransition = (
  processingStatus: string,
): ProcessingTransition => {
  if (processingStatus === "READY") return "ready";
  if (processingStatus === "FAILED") return "failed";
  return "pending";
};

/** 폴링 시작 시각 기준 15분 경과 판정 — 재방문 시 저장된 시작 시각으로 이어 판정한다 (B15) */
export const isPollExpired = (startedAtMs: number, nowMs: number): boolean =>
  nowMs - startedAtMs >= PROCESSING_POLL_TIMEOUT_MS;

export interface ProcessingPollHandle {
  /** 폴링 중지 — 이후 조회·콜백 없음 */
  stop: () => void;
  /** 간격을 기다리지 않는 즉시 조회 — 재진입·탭 포커스 복귀용 (B15) */
  checkNow: () => Promise<void>;
}

export interface ProcessingPollOptions {
  /** 현재 processingStatus 조회 — 실패(reject)는 전이가 아니며 다음 간격에 재조회한다 */
  fetchStatus: () => Promise<string>;
  onReady: () => void;
  onFailed: () => void;
  /** 15분 무전이 만료 — "처리가 늦어지고 있어요" 전환 (B14) */
  onTimeout: () => void;
  /** 폴링 기산점(확정 시각) — 재방문 시 저장값으로 이어 받는다 */
  startedAtMs: number;
  /** 시각 주입 — 기본 Date.now */
  now?: () => number;
}

/** 30초 간격 폴링 시작 — READY/FAILED/만료 시 스스로 멈춘다. [B14] */
export const startProcessingPoll = (
  options: ProcessingPollOptions,
): ProcessingPollHandle => {
  const now = options.now ?? Date.now;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight = false;

  const stop = () => {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const schedule = () => {
    if (stopped) return;
    // 기존 예약을 먼저 취소한다 — 최초 예약과 checkNow(즉시 조회)의 재예약이 경합하면
    // 영상당 타이머가 누적돼 30초 간격보다 잦은 조회가 생긴다 (리뷰 반영)
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      void check();
    }, PROCESSING_POLL_INTERVAL_MS);
  };

  const check = async (): Promise<void> => {
    if (stopped || inFlight) return;
    if (isPollExpired(options.startedAtMs, now())) {
      stop();
      options.onTimeout();
      return;
    }
    inFlight = true;
    try {
      const transition = resolveProcessingTransition(
        await options.fetchStatus(),
      );
      if (stopped) return;
      if (transition === "ready") {
        stop();
        options.onReady();
        return;
      }
      if (transition === "failed") {
        stop();
        options.onFailed();
        return;
      }
    } catch {
      // 조회 실패(네트워크 등)는 전이가 아니다 — 다음 간격에 계속 조회 (B14)
    } finally {
      inFlight = false;
    }
    schedule();
  };

  schedule();

  return { stop, checkNow: check };
};
