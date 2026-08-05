/**
 * 테마 시트 대표 영상 카드의 한국어 표기 포맷 (MSG-298 AC 15, 확정 5 — Figma 표기 채택).
 * shared/format.ts의 formatViewCount("2.4K")·formatRelativeTime("N일 전")과 표기 체계가
 * 달라 feature 로컬 신규 함수로 둔다 — 기존 유틸·타 화면 표기 통일은 범위 밖(스펙).
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * 조회수 표기 — 1만 미만: 콤마 구분("조회 8,600"), 1만 이상: 만 단위 소수 1자리
 * ("조회 2.4만", 정수로 떨어지면 "조회 2만").
 */
export const formatKoreanViewCount = (count: number): string => {
  if (count < 10_000) return `조회 ${count.toLocaleString("ko-KR")}`;
  const man = Math.round(count / 1_000) / 10;
  return `조회 ${man}만`;
};

const KST_MONTH_DAY = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
});

/** KST(Asia/Seoul) 고정 "M월 D일" — 실행 환경 타임존과 무관하게 결정적 */
const formatKstMonthDay = (date: Date): string => {
  const parts = KST_MONTH_DAY.formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${month}월 ${day}일`;
};

/**
 * 업로드 시점 표기 — 24시간 미만: 상대시간("12분 전"·"2시간 전"), 이상: "M월 D일".
 * 1분 미만은 "방금 전"(기존 formatRelativeTime 관례 준용). `now` 주입으로 결정적 테스트.
 */
export const formatUploadTime = (
  iso: string,
  now: Date = new Date(),
): string => {
  const uploadedAt = new Date(iso);
  const elapsed = now.getTime() - uploadedAt.getTime();
  if (elapsed < MINUTE) return "방금 전";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  return formatKstMonthDay(uploadedAt);
};
