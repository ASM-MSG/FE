/**
 * 격자 표시명 파생 (MSG-427 C4) — 웹 `features/map-home/model/grid-label.ts`의 복제본.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 * 동등성은 home-grid-label.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 *
 * 파일명이 웹과 다른 이유: 모바일에는 도감의 `features/dex/model/grid-label.ts`가 이미
 * 있어 이름이 충돌한다.
 *
 * 서버는 구역명(`zoneName`)과 구역 내 셀 코드(`zoneCell`)를 항상 쌍으로 주고,
 * 구역 밖 격자면 둘 다 null이다. **폴백 문자열 조립은 서버가 하지 않는다** —
 * 클라이언트가 zoneName 유무로 분기해 행정동명으로 대체한다.
 */

/** 표시명 파생 입력 — 격자 응답 DTO들의 공통 부분집합 */
export interface GridNaming {
  gridId: string;
  zoneName: string | null;
  zoneCell: string | null;
}

/** 격자 표시명 — 구역 라벨 > 행정동명 > gridId 순으로 폴백한다. [C4] */
export const gridDisplayName = (
  grid: GridNaming,
  regionName?: string | null,
): string => {
  if (grid.zoneName !== null) return `${grid.zoneName} ${grid.zoneCell}`;
  return regionName ?? grid.gridId;
};
