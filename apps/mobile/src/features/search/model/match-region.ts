import type { Region } from "../../../entities/region/model/regions";

/** 자동 이동을 확정하는 최소 검색어 길이 — 1자는 미완성 입력으로 본다 */
const MIN_MATCH_LENGTH = 2;

/**
 * 검색어 → 구 매칭 판정 (AC 11, D-Q1) — trim 후 구 이름 부분 문자열 매칭
 * (웹 explore-cells searchCells와 동일 의미론: 대소문자 무시 includes).
 * 단, 웹은 후보 "집합"을 필터할 뿐이지만 모바일은 매칭이 곧 지도 이동 확정이라
 * 2자 이상 + 유일 매칭일 때만 Region을 반환한다 — "구"처럼 여러 구에 걸리는
 * 검색어가 첫 매칭으로 튕기는 것을 막는다 (PR #37 리뷰 반영).
 * 불일치·모호·빈 검색어는 null (최근 검색 기록만 갱신하고 검색 화면 유지).
 * 순수 함수 — 플랫폼 API에 의존하지 않는다 (RN 경계 규칙).
 */
export const matchRegion = (regions: Region[], term: string): Region | null => {
  const q = term.trim().toLowerCase();
  if (q.length < MIN_MATCH_LENGTH) return null;
  const matched = regions.filter((region) =>
    region.name.toLowerCase().includes(q),
  );
  return matched.length === 1 ? matched[0] : null;
};
