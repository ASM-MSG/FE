import { describe, expect, it } from "vitest";
import { PEEK_HEIGHT, sheetStagePositions, snapStage } from "./sheet-snap";

/**
 * AC 18 (2차 신설): 시트 스냅 판정 — 릴리즈 시점의 시트 위치가 주어지면
 * 4단계 중 가장 가까운 단계를 반환하는 순수 함수. 각 단계 경계·중간값 케이스 단정.
 * 좌표계: 컨테이너(지도 영역, 바텀 내비 바 위) 상단 기준 시트 상단의 y(px).
 */
describe("AC 18 시트 스냅 판정 (sheet-snap)", () => {
  const H = 800;
  const positions = sheetStagePositions(H);

  it("단계 y 위치는 컨테이너 높이에서 파생된다 — 1=상단 10%, 2=절반, 3=피크 높이만 남김, 4=완전 숨김", () => {
    expect(positions).toEqual({
      1: 80,
      2: 400,
      3: H - PEEK_HEIGHT,
      4: 800,
    });
    // 단계 번호가 클수록 y가 크다(시트가 낮다) — 최근접 판정의 전제
    expect(positions[1]).toBeLessThan(positions[2]);
    expect(positions[2]).toBeLessThan(positions[3]);
    expect(positions[3]).toBeLessThan(positions[4]);
  });

  it("각 단계 y 위치 정확히에서 릴리즈하면 그 단계로 스냅한다", () => {
    expect(snapStage(positions[1], positions)).toBe(1);
    expect(snapStage(positions[2], positions)).toBe(2);
    expect(snapStage(positions[3], positions)).toBe(3);
    expect(snapStage(positions[4], positions)).toBe(4);
  });

  it("경계: 인접 두 단계의 중간값보다 위/아래에서 릴리즈하면 가까운 쪽 단계로 스냅한다", () => {
    // 1~2 중간 = 240
    expect(snapStage(239, positions)).toBe(1);
    expect(snapStage(241, positions)).toBe(2);
    // 2~3 중간 = 510 (PEEK_HEIGHT=180 기준 pos3=620)
    expect(snapStage(509, positions)).toBe(2);
    expect(snapStage(511, positions)).toBe(3);
    // 3~4 중간 = 710
    expect(snapStage(709, positions)).toBe(3);
    expect(snapStage(711, positions)).toBe(4);
  });

  it("정확한 중간값에서는 더 펼쳐진(번호가 낮은) 단계로 스냅한다 — 결정적 동작", () => {
    expect(snapStage(240, positions)).toBe(1);
    expect(snapStage(510, positions)).toBe(2);
    expect(snapStage(710, positions)).toBe(3);
  });

  it("범위 밖: 1단계보다 위는 1단계, 4단계보다 아래는 4단계로 스냅한다 (드래그만으로 1~4 전부 도달 — AC 11의 판정 절반)", () => {
    expect(snapStage(0, positions)).toBe(1);
    expect(snapStage(900, positions)).toBe(4);
  });
});
