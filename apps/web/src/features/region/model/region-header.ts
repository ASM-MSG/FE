import type { RegionOrigin } from "./region-panel-store";

/**
 * 패널 헤더 표시명 선택 (MSG-328 사용자 보완 — 헤더 라이브 동기화) — 순수 함수.
 * 지도 SDK/플랫폼(window·router)에 의존하지 않는다 — RN 재사용 대상.
 *
 * - 현재 중심 컨텍스트(auto — 자동 채택·장소 불러오기): 재검색 버튼 라벨과 동일하게
 *   지도 이동에 따라 현재 행정동명을 즉시 반영한다. 현재 중심이 행정동 밖(null)이거나
 *   미도착이면 직전 표시 지역명을 유지한다(빈 헤더·깜빡임 방지).
 * - 명시 선택 컨텍스트(manual — 전체 보기): 사용자가 고른 지역명이 정본이라
 *   라이브 동기화가 덮어쓰지 않는다.
 * 격자 리스트 소스는 여기와 무관하게 displayedRegion이 정본이다(리스트 갱신은 버튼 클릭 시에만).
 */
export const headerRegionName = (
  displayedName: string,
  currentName: string | null,
  origin: RegionOrigin,
): string =>
  origin === "manual" ? displayedName : (currentName ?? displayedName);
