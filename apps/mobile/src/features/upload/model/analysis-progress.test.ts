import { describe, expect, it } from "vitest";
import { analysisProgress } from "./analysis-progress";

/**
 * 기준 3: 분석 진행 바 값이 경과 시간에 따라 증가하되 응답 도착 전에는 100%에 도달하지 않는다.
 * `highlight-preview`가 동기 API라 실제 진행률 정보가 없어 경과 시간 기반 의사 진행률을 쓴다(D7).
 */
describe("analysisProgress — 경과 시간 기반 의사 진행률 (기준 3)", () => {
  it("경과 0ms에서 0이다 (기준 3)", () => {
    expect(analysisProgress(0)).toBe(0);
  });

  it("경과 시간이 늘수록 값이 단조 증가한다 (기준 3)", () => {
    const samples = [0, 500, 2_000, 5_000, 10_000, 20_000, 60_000].map(
      analysisProgress,
    );

    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });

  it("응답이 도착하기 전에는 아무리 오래 걸려도 100%에 도달하지 않는다 (기준 3)", () => {
    expect(analysisProgress(60_000)).toBeLessThan(1);
    expect(analysisProgress(10 * 60_000)).toBeLessThan(1);
    expect(analysisProgress(Number.MAX_SAFE_INTEGER)).toBeLessThan(1);
  });

  it("음수 경과(시각 역행)는 0으로 바닥친다 — ProgressBar 클램프에 기대지 않는다 (경계)", () => {
    expect(analysisProgress(-1_000)).toBe(0);
  });

  it("안내 문구가 말하는 10~20초 구간에서 절반을 넘긴 진행을 보여준다 (기준 2·3)", () => {
    expect(analysisProgress(10_000)).toBeGreaterThan(0.5);
    expect(analysisProgress(20_000)).toBeGreaterThan(analysisProgress(10_000));
  });
});
