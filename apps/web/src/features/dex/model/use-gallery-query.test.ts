import { describe, expect, it } from "vitest";
import { fetchGalleryVideos, galleryQueryOptions } from "./use-gallery-query";

describe("gallery query (AC 7·9, A2)", () => {
  it("queryKey는 지역 파라미터를 분리한 ['dex', 'gallery', region]이다", () => {
    expect(galleryQueryOptions("부산진구").queryKey).toEqual([
      "dex",
      "gallery",
      "부산진구",
    ]);
  });

  it("queryFn은 지역 필터를 거친 영상만 최신 수집순으로 반환한다 — 실 API의 서버 필터 계약", async () => {
    const videos = await fetchGalleryVideos("부산진구");

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

  it("수집이 없는 지역은 빈 배열을 반환한다 — 빈 상태 방어 분기(AC 8 ②, Q5)의 데이터 계약", async () => {
    await expect(fetchGalleryVideos("사상구")).resolves.toEqual([]);
  });
});
