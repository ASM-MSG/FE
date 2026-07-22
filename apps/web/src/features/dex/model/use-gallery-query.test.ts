import { describe, expect, it } from "vitest";
import { fetchGalleryVideos, galleryQueryOptions } from "./use-gallery-query";

describe("gallery query (AC 7·9, A2)", () => {
  it("queryKey는 지역 파라미터를 분리한 ['dex', 'gallery', region]이다", () => {
    expect(galleryQueryOptions("마포구").queryKey).toEqual([
      "dex",
      "gallery",
      "마포구",
    ]);
  });

  it("queryFn은 지역 필터를 거친 영상만 최신 수집순으로 반환한다 — 실 API의 서버 필터 계약", async () => {
    const videos = await fetchGalleryVideos("마포구");

    expect(videos.length).toBeGreaterThan(9); // A6 — 프리뷰 제한 시연 가능
    for (const video of videos) {
      expect(video).toMatchObject({
        id: expect.any(String),
        cellId: expect.any(String),
        cellLabel: expect.any(String),
        collectedAt: expect.any(String),
      });
    }
    // 최신 수집순 (내림차순)
    const times = videos.map((v) => v.collectedAt);
    expect(times).toEqual([...times].sort().reverse());
  });

  it("수집이 없는 지역(디폴트 '중구' 포함)은 빈 배열을 반환한다 — 직접 진입 빈 상태가 정상 (Q1)", async () => {
    await expect(fetchGalleryVideos("중구")).resolves.toEqual([]);
  });
});
