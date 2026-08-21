import { describe, expect, it } from "vitest";
import {
  playbackStaleTime,
  playbackUnavailableMessage,
} from "./video-playback";

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

// MSG-329 병합 승계 (구 use-video-playback.ts) — 재생 불가 사유를 상태별로 구분한다
describe("playbackUnavailableMessage — 재생 불가 사유 문구 (기준 12)", () => {
  it("FAILED는 '처리 중'이 아니라 실패 안내를 돌려준다", () => {
    expect(
      playbackUnavailableMessage({
        processingStatus: "FAILED",
        status: "ACTIVE",
      }),
    ).toBe("영상 처리에 실패했어요. 다시 업로드가 필요해요");
  });

  it("소유자 블라인드는 블라인드 안내를 돌려준다", () => {
    expect(
      playbackUnavailableMessage({
        processingStatus: "READY",
        status: "BLINDED",
      }),
    ).toBe("블라인드 처리된 영상이라 재생할 수 없어요");
  });

  it("처리 중(UPLOADED·ENCODING·BLURRING)은 처리 중 안내를 돌려준다", () => {
    for (const processingStatus of ["UPLOADED", "ENCODING", "BLURRING"]) {
      expect(
        playbackUnavailableMessage({ processingStatus, status: "ACTIVE" }),
      ).toBe("AI가 아직 처리 중인 영상이에요. 처리가 끝나면 재생할 수 있어요");
    }
  });
});
