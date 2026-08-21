import { describe, expect, it } from "vitest";
import { MOCK_CELLS } from "./mock-cells";

/**
 * MOCK_CELLS 영상 표본 videoSrc 배정 (MSG-277 3차 AC 7).
 * 미니 디테일 패널의 HTML5 video 재생 소스 — 외부 CC0 샘플 URL 순환 정책(3차 확정 1).
 */
describe("MOCK_CELLS videoSrc — CC0 샘플 순환 (3차 AC 7)", () => {
  it("모든 영상 표본에 videoSrc가 채워진다 (AC 7)", () => {
    const videos = MOCK_CELLS.flatMap((cell) => cell.videos);

    expect(videos.length).toBeGreaterThan(0);
    for (const video of videos) {
      expect(video.videoSrc, `${video.videoId}의 videoSrc`).toMatch(
        /^https:\/\//,
      );
    }
  });

  it("표본이 2개 이상인 셀에는 샘플이 순환 배정되어 소스가 한 종으로 고정되지 않는다 (AC 7 순환)", () => {
    const cell = MOCK_CELLS.find((c) => c.videos.length >= 2);

    expect(cell).toBeDefined();
    const sources = new Set(cell?.videos.map((v) => v.videoSrc));
    expect(sources.size).toBeGreaterThan(1);
  });
});
