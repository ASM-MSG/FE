import { describe, expect, it } from "vitest";
import { DAY_MS } from "./event-chip";
import { msUntilNextKstMidnight } from "./use-kst-today";

/** AC 5 (D8): 다음 KST 자정까지 ms — 자정 정각이면 만 하루. 웹 원본과 동등. */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/use-kst-today.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{
  msUntilNextKstMidnight: typeof msUntilNextKstMidnight;
}> => import(WEB_PATH);

/** KST 2026-09-02 00:00 = UTC 2026-09-01 15:00 */
const KST_MIDNIGHT = Date.UTC(2026, 8, 1, 15);

describe("msUntilNextKstMidnight 웹 원본 동등성 (AC 5)", () => {
  it("자정 정각이면 만 하루, 그 외엔 남은 ms를 낸다 — 웹과 전건 동일", async () => {
    const web = await loadWeb();
    const samples = [
      KST_MIDNIGHT,
      KST_MIDNIGHT + 1,
      KST_MIDNIGHT + DAY_MS - 1,
      0,
    ];

    for (const nowMs of samples) {
      expect(msUntilNextKstMidnight(nowMs)).toBe(
        web.msUntilNextKstMidnight(nowMs),
      );
    }
    expect(msUntilNextKstMidnight(KST_MIDNIGHT)).toBe(DAY_MS);
    expect(msUntilNextKstMidnight(KST_MIDNIGHT + DAY_MS - 1)).toBe(1);
  });
});
