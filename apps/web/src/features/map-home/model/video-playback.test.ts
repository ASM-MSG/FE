import { describe, expect, it } from "vitest";
import { playbackStaleTime } from "./video-playback";

/**
 * 재생 staleTime 유도 (MSG-326 기준 4, 추정 5).
 * presigned URL TTL(expiresInSec)에서 30초 안전 마진을 뺀 ms — 만료 직전 캐시 히트로
 * 재생 개시 후 만료되는 경계를 줄인다. 마진 이하·null이면 0(캐시 재사용 없음).
 */
describe("playbackStaleTime — expiresInSec → staleTime(ms) (기준 4)", () => {
  it("expiresInSec=600이면 570_000ms다 — 30초 안전 마진", () => {
    expect(playbackStaleTime(600)).toBe(570_000);
  });

  it("마진 이하(30)·0이면 0이다 — 캐시 재사용 없음", () => {
    expect(playbackStaleTime(30)).toBe(0);
    expect(playbackStaleTime(15)).toBe(0);
    expect(playbackStaleTime(0)).toBe(0);
  });

  it("null(playbackUrl 없음)이면 0이다", () => {
    expect(playbackStaleTime(null)).toBe(0);
  });
});
