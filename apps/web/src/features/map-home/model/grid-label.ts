/**
 * 격자 표시명 파생 (MSG-325).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 서버는 구역명(`zoneName`)과 구역 내 셀 코드(`zoneCell`)를 항상 쌍으로 주고,
 * 구역 밖 격자면 둘 다 null이다. **폴백 문자열 조립은 서버가 하지 않는다**(BE `ZoneCellName`) —
 * 클라이언트가 zoneName 유무로 분기해 행정동명(`GET /api/regions/stats/by-grid`의
 * `regionName`)으로 대체한다.
 */

/** 표시명 파생 입력 — 격자 응답 DTO들의 공통 부분집합 */
export interface GridNaming {
  gridId: string;
  zoneName: string | null;
  zoneCell: string | null;
}

/**
 * 격자 표시명 — 구역 라벨 > 행정동명 > gridId 순으로 폴백한다.
 * `zoneName`/`zoneCell`은 명세상 항상 쌍이라 한쪽만 null인 입력은 방어하지 않는다.
 */
export const gridDisplayName = (
  grid: GridNaming,
  regionName?: string | null,
): string => {
  if (grid.zoneName !== null) return `${grid.zoneName} ${grid.zoneCell}`;
  return regionName ?? grid.gridId;
};
