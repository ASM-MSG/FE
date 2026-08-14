/**
 * 갤러리 영상 NEW 배지 판정 (MSG-327 기준 14).
 * 순수 함수 — 기준 시각을 주입받아 `Date.now()` 의존을 뷰 경계로 밀어낸다(테스트 결정성 + RN 경계).
 *
 * 명세(`RegionVideoResponseDto`)에 isNew가 없어 프론트가 판정한다 — 뱃지의 isNew(서버 제공)와
 * 달리 영상은 서버 기준이 없다. 24시간 창은 사용자 확정값(2026-08-14)이며, 서버 기준이
 * 생기면 이 함수를 응답 필드로 대체한다.
 */

/** NEW 표시 유지 시간(ms) — 사용자 확정: 최근 24시간 */
export const NEW_VIDEO_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * 수집 시각이 기준 시각으로부터 24시간 이내인가. [기준 14]
 * 경계(정확히 24시간 전)는 NEW가 아니다. 서버·클라이언트 시계 차로 미래 시각이 와도
 * 경과 시간이 음수라 NEW로 남는다 — 갓 올린 영상이 NEW를 놓치지 않게 하는 쪽으로 기운다.
 */
export const isNewVideo = (createdAt: string, now: number): boolean =>
  now - Date.parse(createdAt) < NEW_VIDEO_WINDOW_MS;
