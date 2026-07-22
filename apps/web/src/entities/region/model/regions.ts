/** 행정구(區) 도메인 모델 — 전체 지역 목록의 한 행 (MSG-114) */
export interface Region {
  /** 구 이름 (예: "부산진구") — Cell.district 매칭 키 */
  name: string;
  /** 격자 수 (목값) — 전체 지역 행의 "격자 N" 표시용 */
  count: number;
}

/**
 * 전체 지역 mock 데이터 — Figma 목업(node 13399-1795)의 8행 구성·순서를 따르되,
 * 지명은 MVP 지역(부산 서면 일대) 인근 구로 치환(목업의 서울 구 이름은 플레이스홀더).
 * count는 목값(실 집계 전 임시). Cell.district(mock-cells)와 name을 일치시켜 지역 필터가 동작한다.
 */
const MOCK_REGIONS: Region[] = [
  { name: "부산진구", count: 1240 },
  { name: "해운대구", count: 2180 },
  { name: "수영구", count: 980 },
  { name: "남구", count: 760 },
  { name: "연제구", count: 1120 },
  { name: "동래구", count: 1640 },
  { name: "사상구", count: 890 },
  { name: "동구", count: 540 },
];

/**
 * 최근 방문 지역 mock 데이터 (비영속) — Figma 목업의 3행 구성, 지명은 부산 치환(부산진구·수영구·남구). [AC 2]
 * MOCK_REGIONS의 구 이름과 동일해, 칩 클릭 시 전체 지역 행 클릭과 같은 지역 필터로 동작한다(D4).
 */
export const MOCK_RECENT_VISITS: string[] = ["부산진구", "수영구", "남구"];

/**
 * 전체 지역 목록을 각 구의 격자 수(count)와 함께, 정해진 순서로 반환한다(목데이터). [AC 15]
 */
export const selectRegions = (): Region[] => MOCK_REGIONS;
