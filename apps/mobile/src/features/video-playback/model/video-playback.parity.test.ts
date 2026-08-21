import { describe, expect, it } from "vitest";
import {
  playbackStaleTime,
  playbackUnavailableMessage,
} from "./video-playback";

/**
 * 기준 1·2 parity: 모바일 `video-playback` ↔ 웹
 * `features/map-home/model/video-playback.ts` 동등성 (스펙 — 웹 순수 모듈 포팅은
 * parity 테스트 동반). presigned TTL 마진과 재생 불가 사유 문구가 플랫폼별로 갈리면
 * 같은 영상이 웹에서는 재생되고 앱에서는 만료 URL을 쓰는 어긋남이 생긴다.
 * 웹 파일이 이동·삭제되면 이 테스트가 깨진다(의도된 드리프트 감지).
 */
interface WebVideoPlaybackModule {
  playbackStaleTime: typeof playbackStaleTime;
  playbackUnavailableMessage: typeof playbackUnavailableMessage;
}

const WEB_VIDEO_PLAYBACK_PATH = new URL(
  "../../../../../web/src/features/map-home/model/video-playback.ts",
  import.meta.url,
).pathname;

const loadWebVideoPlayback = (): Promise<WebVideoPlaybackModule> =>
  import(WEB_VIDEO_PLAYBACK_PATH);

describe("video-playback 동등성 (기준 1·2)", () => {
  it("staleTime이 만료 경계 5샘플에서 웹 원본과 동일하다 (기준 1)", async () => {
    const web = await loadWebVideoPlayback();
    // null(재생 불가) · 마진 미만 · 마진 정확히 · 마진 초과 · 장수명
    const samples = [null, 10, 30, 300, 3600];

    for (const expiresInSec of samples) {
      expect(playbackStaleTime(expiresInSec)).toBe(
        web.playbackStaleTime(expiresInSec),
      );
    }
  });

  it("재생 불가 사유 문구가 상태 조합 4종에서 웹 원본과 동일하다 (기준 2)", async () => {
    const web = await loadWebVideoPlayback();
    const samples = [
      { processingStatus: "ENCODING", status: "ACTIVE" },
      { processingStatus: "FAILED", status: "ACTIVE" },
      { processingStatus: "READY", status: "BLINDED" },
      // BLINDED가 FAILED보다 우선한다 — 순서가 갈리면 문구가 어긋난다
      { processingStatus: "FAILED", status: "BLINDED" },
    ];

    for (const video of samples) {
      expect(playbackUnavailableMessage(video)).toBe(
        web.playbackUnavailableMessage(video),
      );
    }
  });
});
