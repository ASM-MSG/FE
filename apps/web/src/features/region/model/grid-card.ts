/**
 * 지역 격자 카드 표시 로직 (MSG-328 AC 6) — 순수 함수.
 * 지도 SDK/플랫폼(window·router)에 의존하지 않는다 — RN 재사용 대상.
 * 격자 중심 좌표 변환은 entities/cell `cellCenterAt`(EPSG:5179 서버 정본)을 그대로 쓴다 (AC 7).
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
