import { describe, expect, it } from "vitest";
import { MOCK_BADGES } from "./mock-badges";

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

describe("AC 1 mock 뱃지 (mock-badges)", () => {
  it("mock 뱃지는 정확히 6종·순서 고정 — 부산진구 정복·30일 스트릭·첫 업로드·서면 정복·7일 스트릭·첫 격자", () => {
    expect(MOCK_BADGES.map((badge) => badge.name)).toEqual([
      "부산진구 정복",
      "30일 스트릭",
      "첫 업로드",
      "서면 정복",
      "7일 스트릭",
      "첫 격자",
    ]);
  });

  it("뱃지 id는 전부 고유하다 (그리드 key 안정성)", () => {
    const ids = MOCK_BADGES.map((badge) => badge.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("뱃지 id·라벨에 서울 지명이 없다", () => {
    const text = JSON.stringify(MOCK_BADGES);
    for (const banned of SEOUL_PLACE_NAMES) {
      expect(text).not.toContain(banned);
    }
  });
});
