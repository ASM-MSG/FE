import { describe, expect, it } from "vitest";
import { MAP_MAX_ZOOM, steppedZoom } from "./zoom-step";

/** 템플릿 ① 순수 로직 — +/- 한 단 줌과 양끝 클램프 (MSG-601 환류). */
describe("steppedZoom", () => {
  it("한 단씩 오르내린다", () => {
    expect(steppedZoom(16, 1, 6)).toBe(17);
    expect(steppedZoom(16, -1, 6)).toBe(15);
  });

  it("최대 줌(21)과 화면 하한(minZoom)에서 멈춘다 (경계)", () => {
    expect(steppedZoom(MAP_MAX_ZOOM, 1, 6)).toBe(MAP_MAX_ZOOM);
    expect(steppedZoom(6, -1, 6)).toBe(6);
  });

  it("현재 줌이 하한 아래여도(집계 드릴다운 직후 소수 줌 등) 한 번에 하한으로 올린다", () => {
    expect(steppedZoom(5.4, -1, 6)).toBe(6);
  });
});
