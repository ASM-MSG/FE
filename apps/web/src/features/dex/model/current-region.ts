import { clampPct } from "./dex-summary";

/**
 * 현재 지역 결정 로직 (AC 21, 개정 D2).
 * 순수 함수 — 역지오코딩 호출은 shared/region-lookup 어댑터, 측위·조합은 use-current-region 훅의 몫이고
 * 여기는 결과 해석만 담당한다(RN 재사용 대상).
 */

/**
 * 디폴트 지역 (A13) — 서울시청 소재지 "중구".
 * 위치 폴백 좌표(SEOUL_CITY_HALL)를 역지오코딩해도 자연히 "중구"가 나와 두 경로가 수렴한다.
 */
export const DEFAULT_REGION_NAME = "중구";

/** 화면에 표시할 현재 지역 — "{name} 탐험률" 라벨 + 진행 바 값 */
export interface CurrentRegion {
  name: string;
  /** 0~100 클램프 적용 완료 값 (AC 7) */
  pct: number;
}

/**
 * 역지오코딩 결과 + 지역별 탐험률 맵 → 표시 지역. [AC 21]
 * - 결과 null(조회 실패·services 미가용·권한 거부 경로 포함) → 디폴트 "중구"
 * - 맵에 없는 지역 → 0%
 */
export const resolveCurrentRegion = (
  lookupResult: string | null,
  regionExploredPctMap: Record<string, number>,
): CurrentRegion => {
  const name = lookupResult ?? DEFAULT_REGION_NAME;
  return { name, pct: clampPct(regionExploredPctMap[name] ?? 0) };
};
