/**
 * 격자 표시 라벨 (MSG-425 L6) — 웹 `features/region/model/grid-card.ts`의
 * `gridCardLabel` 포팅. 순수 함수 — RN·플랫폼 API에 의존하지 않는다.
 * 동등성은 `grid-label.parity.test.ts`가 웹 원본을 동적 import해 고정한다.
 *
 * 이름이 웹과 다른 이유: 모바일에는 "격자 카드"가 없고 갤러리 섹션 헤더 라벨이
 * 유일 소비처라 역할 이름을 쓴다.
 */

/**
 * 격자명 조합 — `zoneName + " " + zoneCell`(예: "서면 A-14"). [L6]
 * 구역 밖 격자(zoneName·zoneCell은 항상 쌍)는 상위 응답의 행정동 이름으로 폴백한다.
 */
export const gridLabel = (
  zoneName: string | null,
  zoneCell: string | null,
  regionName: string,
): string =>
  zoneName !== null && zoneCell !== null
    ? `${zoneName} ${zoneCell}`
    : regionName;
