/**
 * 도감 요약 표시 파생 (MSG-425 L8) — 웹 `features/dex/model/dex-summary.ts`의
 * `clampPct` 포팅. 순수 함수 — RN·플랫폼 API에 의존하지 않는다.
 * 동등성은 `dex-summary.parity.test.ts`가 웹 원본을 동적 import해 고정한다.
 *
 * 웹의 `formatExploreSummary`(프로필 헤더 보조 문구)는 포팅하지 않는다 —
 * 모바일 도감 헤더는 프로필 축 자체가 없다(요구 ①, 추정 A1).
 */

/** 탐험률을 0~100으로 클램프한다 — 서버 clamp(100 상한)의 이중 방어 겸 음수 방어. [L8] */
export const clampPct = (value: number): number =>
  Math.min(100, Math.max(0, value));
