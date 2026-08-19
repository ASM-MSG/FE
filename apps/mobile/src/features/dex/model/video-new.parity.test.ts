import { describe, expect, it } from "vitest";
import { isNewVideo, NEW_VIDEO_WINDOW_MS } from "./video-new";

/**
 * L7 parity: 모바일 `video-new` ↔ 웹 `features/dex/model/video-new.ts` 동등성
 * (스펙 "추가 parity" — NEW 판정 창이 갈리면 같은 영상이 플랫폼별로 다르게 보인다).
 * 웹 파일이 이동·삭제되면 이 테스트가 깨진다(의도된 드리프트 감지).
 */
interface WebVideoNewModule {
  isNewVideo: typeof isNewVideo;
  NEW_VIDEO_WINDOW_MS: number;
}

const WEB_VIDEO_NEW_PATH = new URL(
  "../../../../../web/src/features/dex/model/video-new.ts",
  import.meta.url,
).pathname;

const loadWebVideoNew = (): Promise<WebVideoNewModule> =>
  import(WEB_VIDEO_NEW_PATH);

const NOW = Date.parse("2026-08-19T12:00:00+09:00");

describe("video-new 동등성 (L7)", () => {
  it("NEW 유지 창 길이가 웹 원본과 동일하다 (L7)", async () => {
    const web = await loadWebVideoNew();

    expect(NEW_VIDEO_WINDOW_MS).toBe(web.NEW_VIDEO_WINDOW_MS);
  });

  it("경계 5샘플(직전/미만/정확히 24h/초과/미래)에서 판정이 웹 원본과 동일하다 (L7)", async () => {
    const web = await loadWebVideoNew();
    const samples = [
      "2026-08-19T11:59:59+09:00",
      "2026-08-18T12:00:00.001+09:00",
      "2026-08-18T12:00:00+09:00",
      "2026-08-17T12:00:00+09:00",
      "2026-08-19T13:00:00+09:00",
    ];

    for (const createdAt of samples) {
      expect(isNewVideo(createdAt, NOW)).toBe(web.isNewVideo(createdAt, NOW));
    }
  });
});
