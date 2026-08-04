import { describe, expect, it } from "vitest";
import { MOCK_GRID_VIDEOS } from "./mock-grid-videos";
import { sortGridVideos } from "./sort-grid-videos";

/** AC 4: 인기순 = 영상 수 내림차순, 최신순 = 최신 등록순 재배열 */
describe("sortGridVideos (AC 4)", () => {
  it("인기순은 영상 수 내림차순으로 재배열된다", () => {
    const sorted = sortGridVideos(MOCK_GRID_VIDEOS, "popular");
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].videoCount).toBeGreaterThanOrEqual(
        sorted[i].videoCount,
      );
    }
  });

  it("최신순은 최신 등록순(등록 시각 내림차순)으로 재배열된다", () => {
    const sorted = sortGridVideos(MOCK_GRID_VIDEOS, "latest");
    for (let i = 1; i < sorted.length; i++) {
      expect(Date.parse(sorted[i - 1].registeredAt)).toBeGreaterThanOrEqual(
        Date.parse(sorted[i].registeredAt),
      );
    }
  });

  it("두 정렬은 서로 다른 순서를 만든다 — 정렬 칩 탭 시 목록 순서가 바뀐다 (AC 14 근거)", () => {
    const popular = sortGridVideos(MOCK_GRID_VIDEOS, "popular");
    const latest = sortGridVideos(MOCK_GRID_VIDEOS, "latest");
    expect(popular.map((v) => v.id)).not.toEqual(latest.map((v) => v.id));
  });

  it("원본 배열을 변경하지 않는다", () => {
    const before = MOCK_GRID_VIDEOS.map((v) => v.id);
    sortGridVideos(MOCK_GRID_VIDEOS, "popular");
    sortGridVideos(MOCK_GRID_VIDEOS, "latest");
    expect(MOCK_GRID_VIDEOS.map((v) => v.id)).toEqual(before);
  });
});

/** AC 17 보조: mock 지명은 부산 서면 기준 — 서울 지명 금지 (Figma 오탐 방지 2) */
describe("MOCK_GRID_VIDEOS", () => {
  it("격자명에 서울 지명(홍대·성수·망원·연남·마포 등)이 없다", () => {
    const seoulNames = /서울|홍대|성수|망원|연남|마포/;
    for (const video of MOCK_GRID_VIDEOS) {
      expect(video.label).not.toMatch(seoulNames);
    }
  });

  it("2열 그리드·가로 스크롤 표시에 충분한 4개 이상이고, 영상 길이는 균일하지 않다 (D7)", () => {
    expect(MOCK_GRID_VIDEOS.length).toBeGreaterThanOrEqual(4);
    expect(
      new Set(MOCK_GRID_VIDEOS.map((v) => v.durationSec)).size,
    ).toBeGreaterThan(1);
  });
});
