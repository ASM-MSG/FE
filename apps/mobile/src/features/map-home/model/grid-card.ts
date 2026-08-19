/**
 * 격자 카드 표시 로직 — 웹 `features/region/model/grid-card.ts`의 복제본 (MSG-423).
 * 동등성은 grid-card.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 */

/**
 * 격자명 조합 — `zoneName + " " + zoneCell`(예: "서면 A-14").
 * 구역 밖 격자(zoneName null — zoneCell과 항상 쌍)는 상위 응답의 regionName으로 폴백한다.
 */
export const gridCardLabel = (
  zoneName: string | null,
  zoneCell: string | null,
  regionName: string,
): string =>
  zoneName !== null && zoneCell !== null
    ? `${zoneName} ${zoneCell}`
    : regionName;
