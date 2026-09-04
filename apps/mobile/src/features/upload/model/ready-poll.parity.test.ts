import { describe, expect, it } from "vitest";
import {
  isReadyPollExpired,
  READY_POLL_FIRST_DELAY_MS,
  READY_POLL_MAX_INTERVAL_MS,
  READY_POLL_TIMEOUT_MS,
  readyPollDelayMs,
  resolveReadyTransition,
} from "./ready-poll";

/**
 * AC 6 (MSG-567): 모바일 `ready-poll`은 웹 `features/upload/model/ready-poll.ts`의 복제본이다.
 * 상수·대기 스케줄·전이·만료 판정을 웹 원본과 런타임 대조해 드리프트를 테스트가 먼저
 * 알린다 — 웹을 import하지 않는 이유는 upload-wizard.ts 주석과 같다(웹 리팩터링이 모바일
 * 런타임에 직결되지 않게). 원본은 변수 경로 동적 import(upload-orchestration.parity 관례).
 */
interface WebReadyPollModule {
  READY_POLL_FIRST_DELAY_MS: number;
  READY_POLL_MAX_INTERVAL_MS: number;
  READY_POLL_TIMEOUT_MS: number;
  readyPollDelayMs: typeof readyPollDelayMs;
  resolveReadyTransition: typeof resolveReadyTransition;
  isReadyPollExpired: typeof isReadyPollExpired;
}
const WEB_READY_POLL_PATH = new URL(
  "../../../../../web/src/features/upload/model/ready-poll.ts",
  import.meta.url,
).pathname;
const loadWeb = (): Promise<WebReadyPollModule> => import(WEB_READY_POLL_PATH);

describe("ready-poll parity — 웹 원본과 동등 (AC 6)", () => {
  it("상수 3종(첫 지연 5초·상한 30초·만료 15분)이 웹과 같다", async () => {
    const web = await loadWeb();
    expect(READY_POLL_FIRST_DELAY_MS).toBe(web.READY_POLL_FIRST_DELAY_MS);
    expect(READY_POLL_MAX_INTERVAL_MS).toBe(web.READY_POLL_MAX_INTERVAL_MS);
    expect(READY_POLL_TIMEOUT_MS).toBe(web.READY_POLL_TIMEOUT_MS);
    expect([
      READY_POLL_FIRST_DELAY_MS,
      READY_POLL_MAX_INTERVAL_MS,
      READY_POLL_TIMEOUT_MS,
    ]).toEqual([5_000, 30_000, 15 * 60_000]);
  });

  it("readyPollDelayMs(1..8) = 5·5·10·20·30·30·30·30초 — 웹과 전건 일치", async () => {
    const web = await loadWeb();
    const attempts = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(attempts.map(readyPollDelayMs)).toEqual(
      attempts.map(web.readyPollDelayMs),
    );
    expect(attempts.slice(0, 6).map(readyPollDelayMs)).toEqual([
      5_000, 5_000, 10_000, 20_000, 30_000, 30_000,
    ]);
  });

  it("전이 판정: READY→ready · FAILED→failed · 그 외 pending — 웹과 전건 일치", async () => {
    const web = await loadWeb();
    const statuses = ["READY", "FAILED", "UPLOADED", "ENCODING", "PENDING", ""];
    expect(statuses.map(resolveReadyTransition)).toEqual(
      statuses.map(web.resolveReadyTransition),
    );
    expect(resolveReadyTransition("READY")).toBe("ready");
    expect(resolveReadyTransition("FAILED")).toBe("failed");
  });

  it("만료 판정 경계(15분 -1ms · 정각 · +1ms)가 웹과 같다", async () => {
    const web = await loadWeb();
    const samples = [
      READY_POLL_TIMEOUT_MS - 1,
      READY_POLL_TIMEOUT_MS,
      READY_POLL_TIMEOUT_MS + 1,
    ];
    expect(samples.map((now) => isReadyPollExpired(0, now))).toEqual(
      samples.map((now) => web.isReadyPollExpired(0, now)),
    );
  });
});
