import { describe, expect, it } from "vitest";
import {
  mockGridVideoCount,
  mockMissionVideoCount,
} from "./mission-video-count";

/**
 * 서버 `videoCount` 도착 전까지의 임시 목 — 값 자체가 아니라 **결정성**이 계약이다.
 * 무작위였다면 재렌더마다 카드 숫자가 흔들려 고장으로 보인다.
 */
describe("목 영상 수 — 같은 키는 항상 같은 값을 준다 (AC 13·23)", () => {
  it("같은 미션 id는 재호출해도 같은 값이다 (AC 13)", () => {
    expect(mockMissionVideoCount(42)).toBe(mockMissionVideoCount(42));
  });

  it("같은 격자 id는 재호출해도 같은 값이다 (AC 23)", () => {
    expect(mockGridVideoCount("39064_112221")).toBe(
      mockGridVideoCount("39064_112221"),
    );
  });

  it("음수를 내지 않는다 (경계 — 배지 문구가 깨지지 않게)", () => {
    for (const id of [0, 1, 7, 12345]) {
      expect(mockMissionVideoCount(id)).toBeGreaterThanOrEqual(0);
    }
  });
});
