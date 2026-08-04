import type { Region } from "../../../entities/region/model/regions";

/**
 * 검색어 → 구 매칭 판정 (AC 11, D-Q1) — trim 후 구 이름 부분 문자열 매칭
 * (웹 explore-cells searchCells와 동일 의미론: 대소문자 무시 includes).
 * 일치 시 지도 이동 대상 Region을, 불일치·빈 검색어는 null을 반환한다
 * (null이면 최근 검색 기록만 갱신하고 검색 화면 유지).
 * 순수 함수 — 플랫폼 API에 의존하지 않는다 (RN 경계 규칙).
 */
export const matchRegion = (
  regions: Region[],
  term: string,
): Region | null => {
  const q = term.trim().toLowerCase();
  if (!q) return null;
  return regions.find((region) => region.name.toLowerCase().includes(q)) ?? null;
};
