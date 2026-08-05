import { describe, expect, it } from "vitest";
import {
  filterGalleryVideos,
  formatGallerySubtitle,
  type GalleryScope,
} from "./gallery-scope";
import { MOCK_GALLERY_VIDEOS } from "./mock-gallery";

const SEOMYEON: GalleryScope = { mode: "region", regionName: "부산진구 서면" };
const HAEUNDAE: GalleryScope = { mode: "region", regionName: "부산 해운대구" };
const ALL: GalleryScope = { mode: "all" };

describe("AC 2 스코프 필터 (filterGalleryVideos)", () => {
  it('region 스코프("부산진구 서면")로 필터하면 12개 전부 해당 지역 영상이다', () => {
    const filtered = filterGalleryVideos(MOCK_GALLERY_VIDEOS, SEOMYEON);
    expect(filtered).toHaveLength(12);
    for (const video of filtered) {
      expect(video.regionName).toBe("부산진구 서면");
    }
  });

  it('region 스코프("부산 해운대구")는 7개를 반환한다', () => {
    const filtered = filterGalleryVideos(MOCK_GALLERY_VIDEOS, HAEUNDAE);
    expect(filtered).toHaveLength(7);
    for (const video of filtered) {
      expect(video.regionName).toBe("부산 해운대구");
    }
  });

  it("전체 스코프는 19개 전부를 원본 순서 그대로 반환한다", () => {
    const filtered = filterGalleryVideos(MOCK_GALLERY_VIDEOS, ALL);
    expect(filtered).toHaveLength(19);
    expect(filtered).toEqual([...MOCK_GALLERY_VIDEOS]);
  });
});

describe("AC 3 부제 포맷터 (formatGallerySubtitle)", () => {
  it('region 스코프 + 12개 → "부산진구 서면 · 영상 12개"', () => {
    expect(formatGallerySubtitle(SEOMYEON, 12)).toBe(
      "부산진구 서면 · 영상 12개",
    );
  });

  it('전체 스코프 + 19개 → "전체 · 영상 19개"', () => {
    expect(formatGallerySubtitle(ALL, 19)).toBe("전체 · 영상 19개");
  });
});
