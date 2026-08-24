import { describe, expect, it } from "vitest";
import {
  applyButton,
  applyWheel,
  initialZoomStepState,
  WHEEL_STEP_THRESHOLD,
  ZOOM_STEP_COOLDOWN_MS,
} from "./zoom-step-policy";

/** 임계에 확실히 닿는 큰 델타 — 위로 굴림(음수)=확대, 아래로 굴림(양수)=축소 */
const BIG = WHEEL_STEP_THRESHOLD * 3;
/** 임계의 절반 — 두 번 누적해야 임계에 닿는 델타 */
const HALF = WHEEL_STEP_THRESHOLD * 0.5 + 1;
/** 쿨다운이 확실히 지난 시간 간격 */
const AFTER_COOLDOWN = ZOOM_STEP_COOLDOWN_MS + 50;

describe("applyWheel — 휠 델타 누적 + 쿨다운 스텝 판정 (AC 1)", () => {
  it("델타 누적이 임계에 닿으면 위로 굴린 방향은 정확히 +1 스텝을 반환한다 (AC 1)", () => {
    const first = applyWheel(initialZoomStepState, -HALF, 1_000);

    const second = applyWheel(first.state, -HALF, 1_010);

    expect(first.step).toBe(0);
    expect(second.step).toBe(1);
  });

  it("아래로 굴린 델타가 임계에 닿으면 -1 스텝을 반환한다 (AC 1)", () => {
    const { step } = applyWheel(initialZoomStepState, BIG, 1_000);

    expect(step).toBe(-1);
  });

  it("임계 미만의 누적은 스텝 0이다 (AC 1)", () => {
    const { step } = applyWheel(initialZoomStepState, -HALF, 1_000);

    expect(step).toBe(0);
  });

  it("한 번의 큰 델타도 방향당 정확히 1스텝을 넘지 않는다 (AC 1·3)", () => {
    const first = applyWheel(initialZoomStepState, -BIG * 4, 1_000);

    // 초과 누적이 이월되면 쿨다운 경과 직후 미세 델타로도 스텝이 또 나간다
    const afterCooldown = applyWheel(first.state, -1, 1_000 + AFTER_COOLDOWN);

    expect(first.step).toBe(1);
    expect(afterCooldown.step).toBe(0);
  });

  it("스텝 직후 쿨다운 안의 연속 입력은 스텝 0이고 누적도 버린다 (AC 1)", () => {
    const stepped = applyWheel(initialZoomStepState, -BIG, 1_000);

    const inCooldown = applyWheel(stepped.state, -BIG, 1_050);
    // 쿨다운 중 입력이 누적에 남았다면 이 미세 델타만으로 임계를 넘어 스텝이 나간다
    const afterCooldown = applyWheel(
      inCooldown.state,
      -1,
      1_000 + AFTER_COOLDOWN,
    );

    expect(inCooldown.step).toBe(0);
    expect(afterCooldown.step).toBe(0);
  });

  it("델타 부호가 반전되면 누적이 리셋된다 (AC 1)", () => {
    const down = applyWheel(initialZoomStepState, HALF, 1_000);

    // 반전: 이전 누적(+HALF)과 상쇄되면 임계에 못 닿지만, 리셋 후 새로 누적하면 닿는다
    const reversed = applyWheel(down.state, -HALF, 1_010);
    const accumulated = applyWheel(reversed.state, -HALF, 1_020);

    expect(reversed.step).toBe(0);
    expect(accumulated.step).toBe(1);
  });
});

describe("applyButton — 줌 버튼도 같은 리미터를 거친다 (AC 2)", () => {
  it("버튼 연타는 쿨다운 간격으로만 줌 단이 진행된다 (AC 2)", () => {
    const first = applyButton(initialZoomStepState, 1, 1_000);

    const inCooldown = applyButton(first.state, 1, 1_100);
    const afterCooldown = applyButton(
      inCooldown.state,
      1,
      1_000 + AFTER_COOLDOWN,
    );

    expect(first.step).toBe(1);
    expect(inCooldown.step).toBe(0);
    expect(afterCooldown.step).toBe(1);
  });

  it("휠 스텝 직후의 버튼 탭은 같은 쿨다운에 막힌다 — 리미터 공유 (AC 2)", () => {
    const wheeled = applyWheel(initialZoomStepState, -BIG, 1_000);

    const button = applyButton(wheeled.state, 1, 1_050);

    expect(wheeled.step).toBe(1);
    expect(button.step).toBe(0);
  });

  it("버튼 스텝 직후의 휠 입력도 같은 쿨다운에 막힌다 — 리미터 공유 (AC 2)", () => {
    const button = applyButton(initialZoomStepState, -1, 1_000);

    const wheeled = applyWheel(button.state, BIG, 1_050);

    expect(button.step).toBe(-1);
    expect(wheeled.step).toBe(0);
  });
});
