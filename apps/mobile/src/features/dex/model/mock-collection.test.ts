import { describe, expect, it } from "vitest";
import { MOCK_COLLECTION_SUMMARY, MOCK_VISIT_RECORDS } from "./mock-collection";

/** MVP 지역 가드 — mock은 부산 서면 기준, 서울 지명 금지 (티켓 [동작 요구] 마지막 항) */
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

describe("AC 4 mock 방문 기록 (mock-collection)", () => {
  it("mock 방문 기록은 정확히 2건 — 부산진구 서면(34회·어제·영상 12), 부산 해운대구(18회·3일 전·영상 7)", () => {
    expect(MOCK_VISIT_RECORDS).toEqual([
      {
        regionName: "부산진구 서면",
        visitCount: 34,
        lastVisitLabel: "어제",
        videoCount: 12,
      },
      {
        regionName: "부산 해운대구",
        visitCount: 18,
        lastVisitLabel: "3일 전",
        videoCount: 7,
      },
    ]);
  });

  it("지역명·요약에 서울 지명이 없다", () => {
    const text = JSON.stringify([MOCK_COLLECTION_SUMMARY, MOCK_VISIT_RECORDS]);
    for (const banned of SEOUL_PLACE_NAMES) {
      expect(text).not.toContain(banned);
    }
  });

  it("도감 요약 mock은 부산진구·52%·12일·23개다 (AC 2의 입력)", () => {
    expect(MOCK_COLLECTION_SUMMARY).toEqual({
      regionName: "부산진구",
      collectionRate: 52,
      streakDays: 12,
      badgeCount: 23,
    });
  });
});
