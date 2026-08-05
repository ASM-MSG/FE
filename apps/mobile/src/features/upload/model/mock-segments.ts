/**
 * AI 추천 구간 목데이터 — 3개 고정 (MSG-303 AC 5, 2026-08-05 기획 변경: Figma 정본 5개→3개).
 * AI 분석은 mock — 영상과 무관하게 항상 이 3개를 보여준다 (303 리스크 1: 길이 분기 없음).
 * 302 안내 카드 문구도 "3개 구간을 추천해요"로 함께 고정 (upload-screen.tsx).
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
];
