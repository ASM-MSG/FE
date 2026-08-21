/**
 * 행정동 표시 포맷 (MSG-327 기준 4·6 — 실 API 응답 실측 보정, 2026-08-14).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 *
 * 스펙 추정 2는 "regionName 원문 그대로 표시"였는데, 실서버가 주는 값이
 * "부산광역시 부산진구 부전2동" 같은 전체 경로라 388px 패널에서 목록이 전부 잘렸다.
 * 묶음 키는 원문 그대로 두고(동명이동 구분 유지) 표시만 마지막 토큰으로 줄인다.
 */

/** 전체 경로 행정동명에서 표시용 행정동 이름만 남긴다 — 묶음 키는 원문이 계속 담당한다 */
export const shortRegionName = (regionName: string): string =>
  regionName.split(" ").at(-1) ?? regionName;

/**
 * 수집률 표시 — 소수 첫째 자리까지, 정수면 정수. [기준 4]
 * 서버 progressRate는 6.85처럼 소수 둘째 자리까지 오는데 그대로 쓰면 진행 바 라벨이
 * 과하게 정밀해 보인다(Figma는 정수 표기).
 */
export const formatProgressRate = (pct: number): string =>
  `${Math.round(pct * 10) / 10}%`;
