/**
 * 재생 순수 로직 (MSG-326 기준 4·12, 추정 5) — staleTime 유도 + 재생 불가 사유 문구.
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

/**
 * 재생 불가 사유 문구 (playbackUrl null 분기 — 기준 12, MSG-329 병합 승계) —
 * "처리 중"으로 뭉뚱그리지 않는다: FAILED는 기다려도 재생되지 않고(재업로드 필요),
 * 소유자 BLINDED도 별도 사유다.
 * 서버 계약: READY 아님·BLINDED(소유자)면 playbackUrl null (GetPlayback 명세).
 */
export const playbackUnavailableMessage = (video: {
  processingStatus: string;
  status: string;
}): string => {
  if (video.status === "BLINDED") {
    return "블라인드 처리된 영상이라 재생할 수 없어요";
  }
  if (video.processingStatus === "FAILED") {
    return "영상 처리에 실패했어요. 다시 업로드가 필요해요";
  }
  return "AI가 아직 처리 중인 영상이에요. 처리가 끝나면 재생할 수 있어요";
};
