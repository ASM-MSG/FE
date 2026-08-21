import { describe, expect, it } from "vitest";
import {
  coversWholeVideo,
  MAX_TRIMMED_DURATION_SEC,
  needsEndpointRecut,
  recutSegment,
} from "./video-trim";

/**
 * 트리밍 끝점 보정 — 순수 계산 (B8). ffmpeg 스트림 카피(-c copy)는 키프레임 경계에서
 * 시작해 실측 길이가 선택 구간보다 길어질 수 있다. 실측 >30초면 초과분만큼 끝점을
 * 앞당겨 재컷해 최종 실측 ≤30초를 보장한다. wasm 실행은 어댑터(api/ffmpeg-trim) 소관.
 */
describe("needsEndpointRecut — 실측 30초 초과 판정 (B8)", () => {
  it("실측이 30초를 초과하면 보정 재컷이 필요하다", () => {
    expect(needsEndpointRecut(30.5)).toBe(true);
  });

  it("정확히 30초 이하는 재컷하지 않는다", () => {
    expect(needsEndpointRecut(30)).toBe(false);
    expect(needsEndpointRecut(27.4)).toBe(false);
  });

  it("상한 상수는 명세 durationSec 상한(30초)이다", () => {
    expect(MAX_TRIMMED_DURATION_SEC).toBe(30);
  });
});

describe("recutSegment — 초과분만큼 끝점을 앞당긴다 (B8)", () => {
  it("실측 초과분만큼 끝점을 앞당긴다 — 같은 키프레임 시작 기준 재컷이 30초로 수렴한다", () => {
    // 선택 [2,30](28초)이 키프레임 밀림으로 실측 32초 → 2초 초과 → 끝점 30→28
    expect(recutSegment({ start: 2, end: 30 }, 32)).toEqual({
      start: 2,
      end: 28,
    });
  });

  it("시작점은 바꾸지 않는다 — 키프레임 앵커 유지", () => {
    expect(recutSegment({ start: 10, end: 38 }, 31).start).toBe(10);
  });

  it("보정 후에도 최소 1초 길이는 남긴다 — 명세 durationSec 하한(1초) 방어", () => {
    const recut = recutSegment({ start: 5, end: 6 }, 40);
    expect(recut.end - recut.start).toBeGreaterThanOrEqual(1);
  });
});

describe("coversWholeVideo — 전체 구간 선택 판정 (트리밍 생략 조건)", () => {
  it("구간이 영상 전체를 덮으면 true — 원본을 그대로 쓰고 wasm 로드를 건너뛴다", () => {
    expect(coversWholeVideo({ start: 0, end: 4.2 }, 4.2)).toBe(true);
  });

  it("일부 구간이면 false", () => {
    expect(coversWholeVideo({ start: 0, end: 10 }, 20)).toBe(false);
    expect(coversWholeVideo({ start: 2, end: 20 }, 20)).toBe(false);
  });
});
