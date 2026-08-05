import { describe, expect, it } from "vitest";
import { MOCK_VISIT_RECORDS } from "./mock-collection";
import { MOCK_GALLERY_VIDEOS } from "./mock-gallery";

/** MVP 지역 가드 — mock은 부산 서면 기준, 서울 지명 금지 (mock-collection 테스트와 동일 목록) */
const SEOUL_PLACE_NAMES = [
  "서울",
  "강남",
  "홍대",
  "마포",
  "성수",
  "종로",
  "여의도",
  "잠실",
  "이태원",
];

const countByRegion = (regionName: string) =>
  MOCK_GALLERY_VIDEOS.filter((video) => video.regionName === regionName).length;

describe("AC 1 mock 갤러리 영상 (mock-gallery)", () => {
  it("mock 갤러리 영상은 총 19개 — 부산진구 서면 12개·부산 해운대구 7개", () => {
    expect(MOCK_GALLERY_VIDEOS).toHaveLength(19);
    expect(countByRegion("부산진구 서면")).toBe(12);
    expect(countByRegion("부산 해운대구")).toBe(7);
  });

  it("지역별 영상 개수가 MOCK_VISIT_RECORDS의 videoCount와 일치한다 (정합 가드)", () => {
    for (const record of MOCK_VISIT_RECORDS) {
      expect(countByRegion(record.regionName)).toBe(record.videoCount);
    }
    // 방문 기록에 없는 지역의 영상이 섞여 있지 않다 — 총합도 일치
    const totalVideoCount = MOCK_VISIT_RECORDS.reduce(
      (sum, record) => sum + record.videoCount,
      0,
    );
    expect(MOCK_GALLERY_VIDEOS).toHaveLength(totalVideoCount);
  });

  it("영상 id는 전부 고유하다 (그리드 key 안정성)", () => {
    const ids = MOCK_GALLERY_VIDEOS.map((video) => video.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("갤러리 mock에 서울 지명이 없다", () => {
    const text = JSON.stringify(MOCK_GALLERY_VIDEOS);
    for (const banned of SEOUL_PLACE_NAMES) {
      expect(text).not.toContain(banned);
    }
  });
});
