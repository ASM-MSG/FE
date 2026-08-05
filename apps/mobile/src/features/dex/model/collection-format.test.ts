import { describe, expect, it } from "vitest";
import {
  formatBadgeCount,
  formatCollectionRate,
  formatStreak,
  formatVideoCount,
  formatVisitSummary,
} from "./collection-format";
import { MOCK_COLLECTION_SUMMARY, MOCK_VISIT_RECORDS } from "./mock-collection";

/**
 * AC 2: 스탯 포맷터가 mock 요약을 "부산진구 52%" · "🔥 12일" · "23개"로 변환한다.
 * 🔥는 텍스트 이모지 리터럴(추정 3). shared/format.ts와 표기 체계가 달라
 * feature 로컬 신규 함수 (스펙 구현 계획 — 중복 없음 확인됨).
 */
describe("AC 2 스탯 포맷터 (collection-format)", () => {
  it('수집률은 "부산진구 52%"로 변환된다', () => {
    expect(formatCollectionRate(MOCK_COLLECTION_SUMMARY)).toBe("부산진구 52%");
  });

  it('현재 스트릭은 "🔥 12일"로 변환된다', () => {
    expect(formatStreak(MOCK_COLLECTION_SUMMARY.streakDays)).toBe("🔥 12일");
  });

  it('획득 뱃지는 "23개"로 변환된다', () => {
    expect(formatBadgeCount(MOCK_COLLECTION_SUMMARY.badgeCount)).toBe("23개");
  });
});

/**
 * AC 3: 방문 기록 포맷터가 mock 기록을 "방문 34회 · 마지막 방문 어제" /
 * "영상 12개" 형태로 변환한다. 마지막 방문은 mock 라벨 문자열 그대로 —
 * 상대시간 계산은 API 연동 티켓 범위 (추정 4).
 */
describe("AC 3 방문 기록 포맷터 (collection-format)", () => {
  it('방문 요약은 "방문 34회 · 마지막 방문 어제" 형태로 변환된다', () => {
    expect(formatVisitSummary(MOCK_VISIT_RECORDS[0])).toBe(
      "방문 34회 · 마지막 방문 어제",
    );
    expect(formatVisitSummary(MOCK_VISIT_RECORDS[1])).toBe(
      "방문 18회 · 마지막 방문 3일 전",
    );
  });

  it('영상 수는 "영상 12개" 형태로 변환된다', () => {
    expect(formatVideoCount(MOCK_VISIT_RECORDS[0].videoCount)).toBe(
      "영상 12개",
    );
    expect(formatVideoCount(MOCK_VISIT_RECORDS[1].videoCount)).toBe("영상 7개");
  });
});
