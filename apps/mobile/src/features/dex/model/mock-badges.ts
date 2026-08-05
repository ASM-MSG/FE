/**
 * 뱃지 진열장 mock 6종 (MSG-301 AC 1) — 부산 서면 기준, 서울 지명 금지.
 * 순서 고정: 시안 상단 3종 + 티켓 예시 하단 3종 (ASSUMPTION 1 — 지역 정복·
 * 스트릭·최초 행위 계열 정합). 필드는 id·name 최소 구조 (ASSUMPTION 3) —
 * 획득 상태·이미지 URL은 API 연동 티켓(MSG-201)에서 확장.
 */

export interface Badge {
  id: string;
  name: string;
}

/** 진열장 대표 뱃지 6종 — 정적 프리뷰, badgeCount(23)와 비연동 (ASSUMPTION 5) */
export const MOCK_BADGES: readonly Badge[] = [
  { id: "busanjin-conquer", name: "부산진구 정복" },
  { id: "streak-30", name: "30일 스트릭" },
  { id: "first-upload", name: "첫 업로드" },
  { id: "seomyeon-conquer", name: "서면 정복" },
  { id: "streak-7", name: "7일 스트릭" },
  { id: "first-grid", name: "첫 격자" },
];
