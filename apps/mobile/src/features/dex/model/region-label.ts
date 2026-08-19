/**
 * 행정동 표시 포맷 (MSG-425 L8·L9) — 웹 `features/dex/model/region-label.ts` 포팅.
 * 순수 함수 — RN·플랫폼 API에 의존하지 않는다.
 * 동등성은 `region-label.parity.test.ts`가 웹 원본을 동적 import해 고정한다.
 *
 * 실서버 regionName은 "부산광역시 부산진구 부전2동" 같은 전체 경로라 좁은 화면에서
 * 목록이 잘린다. 묶음 키는 원문 그대로 두고(동명이동 구분 유지) 표시만 마지막 토큰으로 줄인다.
 */

/**
 * 전체 경로 행정동명에서 표시용 행정동 이름만 남긴다 — 묶음 키는 원문이 계속 담당한다. [L9]
 * 웹 원본은 `.at(-1)`을 쓰지만 Hermes(RN 0.86) 안전 경로로 인덱스 접근을 쓴다 —
 * 결과 동등성은 parity 테스트가 고정한다.
 */
export const shortRegionName = (regionName: string): string => {
  const tokens = regionName.split(" ");
  return tokens[tokens.length - 1] ?? regionName;
};

/**
 * 탐험률 표시 — 소수 첫째 자리까지, 정수면 정수. [L8]
 * 서버 progressRate는 6.85처럼 소수 둘째 자리까지 오는데 정수로 반올림하면 초기
 * 사용자의 탐험률이 부풀거나 0%로 뭉개진다 (승인 Q4 — Figma의 `52%`는 샘플값).
 */
export const formatProgressRate = (pct: number): string =>
  `${Math.round(pct * 10) / 10}%`;
