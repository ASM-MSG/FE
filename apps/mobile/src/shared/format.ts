/**
 * 크로스 도메인 표시 포맷 유틸 — 웹 원본의 복제본 (MSG-296, D1 관례:
 * 복제 + 동등성 테스트, 공유 패키지 승격 아님).
 * - formatRelativeTime: 웹 `apps/web/src/shared/format.ts`
 * - formatViewCount: 웹 `apps/web/src/features/explore/model/cell-detail.ts`
 * 동등성은 format.parity.test.ts가 웹 원본을 직접 import해 단정한다.
 * formatDuration은 grid-video-card 로컬 함수를 이곳으로 이동 (두 번째 용례 발생).
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * 경과 시간을 "N분 전 / N시간 전 / N일 전"으로 변환한다.
 * 1분 미만은 "방금 전". `now`를 주입받아 결정적으로 테스트 가능하다.
 */
export const formatRelativeTime = (
  iso: string,
  now: Date = new Date(),
): string => {
  const elapsed = now.getTime() - new Date(iso).getTime();
  if (elapsed < MINUTE) return "방금 전";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  return `${Math.floor(elapsed / DAY)}일 전`;
};

/** 소수 첫째 자리까지, 10 이상이면 정수로 반올림해 문자열화 */
const compact = (value: number): string => {
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return String(rounded);
};

/** 반올림 시 1000K로 넘어가는 경계값 — 이 이상은 M 단위로 표기해야 "1000K" 오표기가 안 생긴다 */
const K_TO_M_THRESHOLD = 999_500;

/**
 * 조회수를 축약한다.
 * - 1000 미만: 원시 값 그대로 (138 → "138")
 * - 천 단위: 소수 첫째 자리 K (1400 → "1.4K")
 * - 만 단위 이상: 소수 없이 K (12000 → "12K")
 */
export const formatViewCount = (count: number): string => {
  if (count < 1_000) return String(count);
  if (count < K_TO_M_THRESHOLD) return `${compact(count / 1_000)}K`;
  return `${compact(count / 1_000_000)}M`;
};

/** 초 → "m:ss" 뱃지 표기 (예: 24 → "0:24") — 표시 전용 포맷 */
export const formatDuration = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
