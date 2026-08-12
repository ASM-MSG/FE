/**
 * 재생 staleTime 유도 (MSG-326 기준 4, 추정 5).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 */

/**
 * 안전 마진(초) — presigned URL 만료 직전 캐시 히트로 재생 개시 후 만료되는 경계를 줄인다.
 * expiresInSec가 마진 이하로 매우 짧으면 staleTime 0 → 열 때마다 재조회되지만
 * 재생 자체는 성립하므로 수용한다 (스펙 리스크).
 */
const SAFETY_MARGIN_SEC = 30;

/**
 * `VideoPlaybackResponseDto.expiresInSec` → TanStack Query staleTime(ms).
 * null(playbackUrl 없음 — non-READY·BLINDED)·마진 이하면 0으로 캐시 재사용을 막아
 * 만료된 presigned URL이 캐시에서 재생되지 않게 한다.
 */
export const playbackStaleTime = (expiresInSec: number | null): number => {
  if (expiresInSec === null) return 0;
  return Math.max(0, (expiresInSec - SAFETY_MARGIN_SEC) * 1000);
};
