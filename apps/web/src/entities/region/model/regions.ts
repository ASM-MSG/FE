/** 행정구(區) 도메인 모델 — 전체 지역 목록의 한 행 (MSG-114) */
export interface Region {
  /** 구 이름 (예: "마포구") — Cell.district 매칭 키 */
  name: string;
  /** 격자 수 (목값) — 전체 지역 행의 "격자 N" 표시용 */
  count: number;
}

/**
 * 전체 지역 mock 데이터 — Figma 목업(node 13399-1795)의 8개 구, 표기 순서 그대로.
 * count는 목값(실 집계 전 임시). Cell.district(mock-cells)와 name을 일치시켜 지역 필터가 동작한다.
 */
const MOCK_REGIONS: Region[] = [
  { name: "마포구", count: 1240 },
  { name: "강남구", count: 2180 },
  { name: "성동구", count: 980 },
  { name: "용산구", count: 760 },
  { name: "영등포구", count: 1120 },
  { name: "송파구", count: 1640 },
  { name: "관악구", count: 890 },
  { name: "종로구", count: 540 },
];

/**
 * 최근 방문 지역 mock 데이터 (비영속) — Figma 목업 기준 마포구·성동구·용산구. [AC 2]
 * MOCK_REGIONS의 구 이름과 동일해, 칩 클릭 시 전체 지역 행 클릭과 같은 지역 필터로 동작한다(D4).
 */
export const MOCK_RECENT_VISITS: string[] = ["마포구", "성동구", "용산구"];

/**
 * 전체 지역 목록을 각 구의 격자 수(count)와 함께, 정해진 순서로 반환한다(목데이터). [AC 15]
 */
export const selectRegions = (): Region[] => MOCK_REGIONS;
