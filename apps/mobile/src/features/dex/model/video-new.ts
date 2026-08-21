/**
 * 갤러리 영상 NEW 배지 판정 (MSG-425 L7) — 웹 `features/dex/model/video-new.ts` 포팅.
 * 순수 함수 — 기준 시각을 주입받아 `Date.now()` 의존을 뷰 경계로 밀어낸다
 * (테스트 결정성 + RN 경계). 동등성은 `video-new.parity.test.ts`가 고정한다.
 *
 * 명세(`RegionVideoResponseDto`)에 isNew가 없어 프론트가 판정한다. 창 길이가 웹과
 * 갈리면 같은 영상이 플랫폼별로 다르게 보이므로 parity 테스트가 방어한다.
 */

/** NEW 표시 유지 시간(ms) — 최근 24시간 */
export const NEW_VIDEO_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * 수집 시각이 기준 시각으로부터 24시간 이내인가. [L7]
 * 경계(정확히 24시간 전)는 NEW가 아니다. 서버·클라이언트 시계 차로 미래 시각이 와도
 * 경과 시간이 음수라 NEW로 남는다 — 갓 올린 영상이 NEW를 놓치지 않게 하는 쪽으로 기운다.
 */
export const isNewVideo = (createdAt: string, now: number): boolean =>
  now - Date.parse(createdAt) < NEW_VIDEO_WINDOW_MS;
