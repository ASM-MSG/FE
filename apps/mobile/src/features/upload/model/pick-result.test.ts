import { describe, expect, it } from "vitest";
import { resolvePickOutcome } from "./pick-result";

/** MSG-302 AC 8 — 권한·picker 결과를 denied | canceled | picked로 판정하는 순수 함수 */
describe("resolvePickOutcome (MSG-302 AC 8)", () => {
  it("권한 거부 시 denied — 안내 표시 대상, 다음 단계 이동 없음", () => {
    expect(resolvePickOutcome(false, null)).toEqual({ kind: "denied" });
  });

  it("선택 취소 시 canceled — 아무 동작 없음", () => {
    expect(resolvePickOutcome(true, { canceled: true, assets: null })).toEqual({
      kind: "canceled",
    });
  });

  it("영상 확보 시 picked — uri와 durationSec(ms→초 반올림)을 담는다", () => {
    expect(
      resolvePickOutcome(true, {
        canceled: false,
        assets: [{ uri: "file:///pick.mov", duration: 41_600 }],
      }),
    ).toEqual({
      kind: "picked",
      video: { uri: "file:///pick.mov", durationSec: 42 },
    });
  });

  it("duration이 없는 자산은 durationSec null로 확보된다 — 304 길이 뱃지 폴백 대상", () => {
    expect(
      resolvePickOutcome(true, {
        canceled: false,
        assets: [{ uri: "file:///pick.mp4", duration: null }],
      }),
    ).toEqual({
      kind: "picked",
      video: { uri: "file:///pick.mp4", durationSec: null },
    });
  });
});
