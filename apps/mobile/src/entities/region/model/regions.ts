import type { LatLng } from "../../cell/model/grid";

/**
 * 행정구(區) 도메인 모델 — 웹 `apps/web/src/entities/region/model/regions.ts`의
 * 복제본 + 모바일 확장(center) (MSG-297 — 복제 + 동등성 테스트 방식).
 * name·count 구성의 웹 동등성은 regions.parity.test.ts가 단정한다.
 */
export interface Region {
  /** 구 이름 (예: "부산진구") */
  name: string;
  /** 격자 수 (목값) — 전체 지역 행의 "격자 N" 표시용 [AC 9] */
  count: number;
  /**
   * 구 중심 좌표(목값, 구청 인근 대략 실좌표) — 지도 이동(AC 3·10)용 모바일 확장.
   * 웹에는 없는 필드라 parity 대상이 아니다 (스펙 구현 계획).
   */
  center: LatLng;
}

/**
 * 전체 지역 mock 데이터 — 구성·순서·count는 웹 정본과 동일 (부산 8개 구, 서버 API 제외 범위).
 */
const MOCK_REGIONS: Region[] = [
  { name: "부산진구", count: 1240, center: { lat: 35.1631, lng: 129.0532 } },
  { name: "해운대구", count: 2180, center: { lat: 35.1631, lng: 129.1636 } },
  { name: "수영구", count: 980, center: { lat: 35.1453, lng: 129.1132 } },
  { name: "남구", count: 760, center: { lat: 35.1366, lng: 129.0843 } },
  { name: "연제구", count: 1120, center: { lat: 35.1761, lng: 129.0796 } },
  { name: "동래구", count: 1640, center: { lat: 35.2048, lng: 129.0836 } },
  { name: "사상구", count: 890, center: { lat: 35.1526, lng: 128.991 } },
  { name: "동구", count: 540, center: { lat: 35.1292, lng: 129.0451 } },
];

/**
 * 최근 방문 지역 mock 데이터 (비영속) — 웹 정본과 동일(부산진구·수영구·남구). [AC 3]
 * MOCK_REGIONS의 구 이름과 동일해, 칩 탭 시 전체 지역 행 탭과 같은 지도 이동으로 동작한다.
 */
export const MOCK_RECENT_VISITS: string[] = ["부산진구", "수영구", "남구"];

/**
 * 전체 지역 목록을 각 구의 격자 수(count)·중심 좌표와 함께, 정해진 순서로 반환한다(목데이터). [AC 9]
 */
export const selectRegions = (): Region[] => MOCK_REGIONS;
