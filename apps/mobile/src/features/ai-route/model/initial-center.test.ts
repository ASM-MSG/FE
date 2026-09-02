import { describe, expect, it } from "vitest";
import {
  type InitialCenterPhase,
  nextInitialCenterPhase,
} from "./initial-center";

/**
 * 템플릿 ①(순수 로직 · 상태기계) — 진입 1회 측위(D1) 정착 판정 (MSG-556 codex 재리뷰 P2).
 * `viewport` 이벤트는 GridMap.onViewportChange 호출이다 — 첫 번째는 씨딩(onCameraChanged),
 * 이후는 카메라 idle.
 */
describe("nextInitialCenterPhase — 초기 중심 정착 전 제출 차단 + 늦은 측위 이동 억제", () => {
  it("첫 뷰포트(씨딩)만으로는 정착하지 않는다 — 측위 전 폴백(서면) 뷰포트로 제출이 열리지 않는다", () => {
    expect(nextInitialCenterPhase("seeding", { type: "viewport" })).toBe(
      "locating",
    );
  });

  it("측위가 이동을 요구하면 moving이 되고, 그 이동이 끝난 idle 뷰포트가 와야 정착한다", () => {
    const moving = nextInitialCenterPhase("locating", {
      type: "located",
      moves: true,
    });
    expect(moving).toBe("moving");
    expect(nextInitialCenterPhase(moving, { type: "viewport" })).toBe(
      "settled",
    );
  });

  it("측위가 폴백(이동 없음)이면 즉시 정착한다 — 초기 카메라가 이미 서면·1km", () => {
    expect(
      nextInitialCenterPhase("locating", { type: "located", moves: false }),
    ).toBe("settled");
  });

  it("측위 전에 사용자가 지도를 움직이면(idle) 정착하고, 뒤늦은 측위는 moving으로 돌아가지 않는다 — 늦은 이동 억제", () => {
    const settled = nextInitialCenterPhase("locating", { type: "viewport" });
    expect(settled).toBe("settled");
    expect(
      nextInitialCenterPhase(settled, { type: "located", moves: true }),
    ).toBe("settled");
  });

  it("씨딩 전에 측위가 먼저 끝나도 같은 규칙이다 (경계) — 이동 요구면 moving, 아니면 settled", () => {
    const seeding: InitialCenterPhase = "seeding";
    expect(
      nextInitialCenterPhase(seeding, { type: "located", moves: true }),
    ).toBe("moving");
    expect(
      nextInitialCenterPhase(seeding, { type: "located", moves: false }),
    ).toBe("settled");
  });
});
