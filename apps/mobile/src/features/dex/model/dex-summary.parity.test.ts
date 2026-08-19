import { describe, expect, it } from "vitest";
import { clampPct } from "./dex-summary";

/**
 * L8 parity: 모바일 `clampPct` ↔ 웹 `features/dex/model/dex-summary.ts` 동등성
 * (티켓 포팅 슬롯 "dex-summary"). 웹 원본은 변수 경로 동적 import로 로드한다 —
 * 웹 파일이 이동·삭제되면 이 테스트가 깨진다(의도된 드리프트 감지).
 * 웹 원본의 `DexSummary` import는 type-only라 런타임 의존이 딸려오지 않는다.
 */
interface WebDexSummaryModule {
  clampPct: typeof clampPct;
}

const WEB_DEX_SUMMARY_PATH = new URL(
  "../../../../../web/src/features/dex/model/dex-summary.ts",
  import.meta.url,
).pathname;

const loadWebDexSummary = (): Promise<WebDexSummaryModule> =>
  import(WEB_DEX_SUMMARY_PATH);

describe("clampPct 동등성 (L8)", () => {
  it("경계 6샘플에서 웹 원본과 결과가 동일하다 (L8)", async () => {
    const web = await loadWebDexSummary();

    for (const sample of [-1, 0, 0.4, 52, 100, 100.7]) {
      expect(clampPct(sample)).toBe(web.clampPct(sample));
    }
  });
});
