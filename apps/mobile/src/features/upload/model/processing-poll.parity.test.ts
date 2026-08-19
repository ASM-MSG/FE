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
 * 기준 44: 블러 처리 폴링 모델을 웹 MSG-329 원본과 동등하게 포팅한다.
 * **모델만** 포팅한다(D9) — 소비 워처·대기 저장소·완료 통지 UI는 MSG-429 소관이라
 * 이 티켓에는 호출부가 없다. 웹 원본은 변수 경로 동적 import
 * (upload-wizard.parity.test.ts 주석 참조).
 */
interface WebProcessingPollModule {
  PROCESSING_POLL_INTERVAL_MS: number;
  PROCESSING_POLL_TIMEOUT_MS: number;
  resolveProcessingTransition: typeof resolveProcessingTransition;
  isPollExpired: typeof isPollExpired;
  startProcessingPoll: typeof startProcessingPoll;
}
const WEB_PROCESSING_POLL_PATH = new URL(
  "../../../../../web/src/features/upload/model/processing-poll.ts",
  import.meta.url,
).pathname;
const loadWebProcessingPoll = (): Promise<WebProcessingPollModule> =>
  import(WEB_PROCESSING_POLL_PATH);

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

describe("웹 원본 동등성 (기준 44)", () => {
  it("폴링 간격·상한 상수가 웹과 같다 (30초 · 15분)", async () => {
    const web = await loadWebProcessingPoll();

    expect(PROCESSING_POLL_INTERVAL_MS).toBe(web.PROCESSING_POLL_INTERVAL_MS);
    expect(PROCESSING_POLL_TIMEOUT_MS).toBe(web.PROCESSING_POLL_TIMEOUT_MS);
  });

  it("상태 문자열 전 조합에서 웹 전이 판정과 동일하다", async () => {
    const web = await loadWebProcessingPoll();

    for (const status of STATUSES) {
      expect(resolveProcessingTransition(status)).toBe(
        web.resolveProcessingTransition(status),
      );
    }
  });

  it("만료 판정 경계에서 웹과 동일하다", async () => {
    const web = await loadWebProcessingPoll();

    for (const now of [
      0,
      1,
      PROCESSING_POLL_TIMEOUT_MS - 1,
      PROCESSING_POLL_TIMEOUT_MS,
      10 ** 9,
    ]) {
      expect(isPollExpired(0, now)).toBe(web.isPollExpired(0, now));
    }
  });
});
