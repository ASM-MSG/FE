import { describe, expect, it } from "vitest";
import {
  isPollExpired,
  PROCESSING_POLL_INTERVAL_MS,
  PROCESSING_POLL_TIMEOUT_MS,
  resolveProcessingTransition,
  startProcessingPoll,
  type ProcessingTransition,
} from "./processing-poll";

/**
 * 기준 44(MSG-424): 블러 처리 폴링 모델 — 원래 웹 MSG-329 원본을 동적 import해
 * 동등성을 고정하던 패리티 테스트였으나, 웹 원본은 MSG-476에서 삭제됐다
 * (웹 블러 파이프라인 제거). 패리티 앵커가 소멸해 **로컬 단위 테스트로 전환**하고,
 * 기존 패리티 케이스의 기대값(30초 간격 · 15분 상한 · READY/FAILED 전이)은
 * 고정 리터럴로 동결해 같은 동작을 계속 검증한다. 모바일 블러 경로는 티켓 범위
 * 밖의 살아 있는 구현이므로 판정 규칙의 정본은 이제 이 파일과 processing-poll.ts다.
 */

const STATUSES = [
  "READY",
  "FAILED",
  "UPLOADED",
  "ENCODING",
  "BLURRING",
  "",
  "ready",
];

describe("resolveProcessingTransition — 처리 상태 전이 판정", () => {
  it("READY·FAILED만 전이이고 나머지는 대기다", () => {
    expect(resolveProcessingTransition("READY")).toBe<ProcessingTransition>(
      "ready",
    );
    expect(resolveProcessingTransition("FAILED")).toBe<ProcessingTransition>(
      "failed",
    );
    expect(resolveProcessingTransition("BLURRING")).toBe<ProcessingTransition>(
      "pending",
    );
  });
});

describe("isPollExpired — 15분 무전이 만료 판정", () => {
  it("시작 시각으로부터 15분이 지나면 만료다", () => {
    expect(isPollExpired(0, PROCESSING_POLL_TIMEOUT_MS - 1)).toBe(false);
    expect(isPollExpired(0, PROCESSING_POLL_TIMEOUT_MS)).toBe(true);
  });
});

describe("startProcessingPoll — 폴링 시작·중지", () => {
  it("checkNow가 READY를 만나면 onReady 후 스스로 멈춘다", async () => {
    let readyCount = 0;
    const handle = startProcessingPoll({
      fetchStatus: async () => "READY",
      onReady: () => {
        readyCount += 1;
      },
      onFailed: () => {},
      onTimeout: () => {},
      startedAtMs: 0,
      now: () => 1000,
    });

    await handle.checkNow();
    await handle.checkNow();
    handle.stop();

    expect(readyCount).toBe(1);
  });

  it("만료된 시작 시각이면 조회 없이 onTimeout으로 멈춘다", async () => {
    let fetched = 0;
    let timedOut = false;
    const handle = startProcessingPoll({
      fetchStatus: async () => {
        fetched += 1;
        return "BLURRING";
      },
      onReady: () => {},
      onFailed: () => {},
      onTimeout: () => {
        timedOut = true;
      },
      startedAtMs: 0,
      now: () => PROCESSING_POLL_TIMEOUT_MS,
    });

    await handle.checkNow();
    handle.stop();

    expect(fetched).toBe(0);
    expect(timedOut).toBe(true);
  });
});

describe("판정 규칙 동결 (구 웹 패리티 케이스 — 기대값 리터럴 고정)", () => {
  it("폴링 간격·상한 상수는 30초 · 15분이다 (티켓 19 확정)", () => {
    expect(PROCESSING_POLL_INTERVAL_MS).toBe(30_000);
    expect(PROCESSING_POLL_TIMEOUT_MS).toBe(900_000);
  });

  it("상태 문자열 전 조합의 전이 판정이 동결값과 같다", () => {
    const expected: Record<string, ProcessingTransition> = {
      READY: "ready",
      FAILED: "failed",
      UPLOADED: "pending",
      ENCODING: "pending",
      BLURRING: "pending",
      "": "pending",
      ready: "pending",
    };

    for (const status of STATUSES) {
      expect(resolveProcessingTransition(status)).toBe(expected[status]);
    }
  });

  it("만료 판정 경계가 동결값과 같다", () => {
    const cases: Array<[now: number, expired: boolean]> = [
      [0, false],
      [1, false],
      [PROCESSING_POLL_TIMEOUT_MS - 1, false],
      [PROCESSING_POLL_TIMEOUT_MS, true],
      [10 ** 9, true],
    ];

    for (const [now, expired] of cases) {
      expect(isPollExpired(0, now)).toBe(expired);
    }
  });
});
