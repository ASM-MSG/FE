/**
 * AI 추천 구간 목데이터 — Figma "AI 하이라이트 추천"(14094:4312) 정본 5개 (MSG-303 AC 5).
 * AI 분석은 mock — 영상과 무관하게 항상 이 5개를 보여준다 (303 리스크 1: 길이 분기 없음).
 * 302 안내 카드의 "3~5개 구간" 문구는 범위 서술이라 5개 고정과 불일치 아님 (302 오탐 방지).
 */

export interface HighlightSegment {
  id: string;
  /** 시간 범위 라벨 (Figma 표기 그대로 — en dash) */
  timeRange: string;
  /** 추천 사유 */
  reason: string;
}

export const MOCK_SEGMENTS: HighlightSegment[] = [
  { id: "segment-1", timeRange: "0:03 – 0:08", reason: "움직임·밝기 지속" },
  { id: "segment-2", timeRange: "0:14 – 0:19", reason: "장면 변화 풍부" },
  { id: "segment-3", timeRange: "0:21 – 0:26", reason: "조회수 예측 상위" },
  { id: "segment-4", timeRange: "0:25 – 0:30", reason: "색감·구도 안정적" },
  { id: "segment-5", timeRange: "0:28 – 0:33", reason: "동작 다이나믹" },
];
