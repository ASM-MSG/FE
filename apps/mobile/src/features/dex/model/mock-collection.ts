/**
 * 개인 도감 mock 데이터 (MSG-299 AC 2~4) — 부산 서면 기준, 서울 지명 금지.
 * API 연동은 제외 범위 — 후속 연동 시 도감 요약 MSG-152·격자 목록 MSG-153 응답
 * 구조를 참조 예정이라 필드는 구조화해 둔다. lastVisitLabel은 라벨 문자열 보관 —
 * 상대시간 계산 로직은 API 연동 티켓에서 도입 (추정 4: shared/formatRelativeTime은
 * "어제" 대신 "1일 전"을 내므로 그때 표기 체계 정합 필요).
 */

export interface CollectionSummary {
  /** 수집률 기준 지역명 */
  regionName: string;
  /** 수집률 (%) */
  collectionRate: number;
  /** 현재 스트릭 (일) */
  streakDays: number;
  /** 획득 뱃지 수 */
  badgeCount: number;
}

export interface VisitRecord {
  regionName: string;
  visitCount: number;
  /** 마지막 방문 표시 라벨 — mock 문자열 그대로 (추정 4) */
  lastVisitLabel: string;
  videoCount: number;
}

/** 스탯 카드 요약 mock (AC 2·6) */
export const MOCK_COLLECTION_SUMMARY: CollectionSummary = {
  regionName: "부산진구",
  collectionRate: 52,
  streakDays: 12,
  badgeCount: 23,
};

/** 지역별 방문 기록 mock 2건 (AC 4·9) — 행은 지역 갤러리(MSG-300)의 진입점 예정 */
export const MOCK_VISIT_RECORDS: readonly VisitRecord[] = [
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
];
