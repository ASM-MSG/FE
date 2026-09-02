/**
 * 크로스 도메인 표시 포맷 유틸.
 * 지도 SDK/플랫폼(window·router)에 의존하지 않는다 — RN 재사용 대상.
 * 원래 features/explore/model/cell-detail.ts에 있었으나 도감(MSG-121)도 쓰게 되어
 * 교차 feature import를 피하려고 shared로 이동했다 (기존 위치에서 re-export 유지).
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

/** ISO 시각을 "M월 D일"로 변환한다 — 앞자리 0 없음 (MSG-253 AC 8, 예: "7월 21일"). */
export const formatMonthDay = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

/**
 * 영상 길이(초)를 `m:ss`로 포맷한다(24→"0:24", 84→"1:24", 605→"10:05").
 * 값이 `undefined`이면 null을 반환한다 — 배지 미표시 신호.
 * 원래 features/explore/model/explore-cells.ts에 있었으나 탐색 제거(MSG-328) 후에도
 * 피드 카드·상세 시트·지역 격자 카드가 크로스 도메인으로 쓰므로 shared로 이동했다.
 */
export const formatDuration = (sec?: number): string | null => {
  if (sec === undefined) return null;
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const KST_OFFSET_MS = 9 * HOUR;

/** epoch ms → KST 기준 일수 정수 (실행 환경 TZ 무관) */
const kstDayIndex = (epochMs: number): number =>
  Math.floor((epochMs + KST_OFFSET_MS) / DAY);

const pad2 = (value: number): string => value.toString().padStart(2, "0");

/**
 * 접수 시각을 KST 기준 상대/절대 혼합 표기로 변환한다 (MSG-552 AC 1).
 * 오늘 → "오늘 HH:mm" · 어제 → "어제 HH:mm" · 그 외 → "M.D HH:mm"(월·일 앞자리 0 없음).
 *
 * 위 `formatRelativeTime`·`formatMonthDay`는 **로컬 타임존** 기준이라 관리자 콘솔의
 * KST 고정 표기에 쓸 수 없다 — KST 오프셋을 더한 epoch 산술 + `getUTC*` 판독으로
 * 실행 환경 타임존과 무관하게 결정적이다 (upload-grass의 KST epoch 일수 산술 선례).
 * `now`를 주입받아 테스트가 "오늘"을 고정한다. 연도는 표기하지 않는다 (추정 8).
 */
export const formatKstReceiptTime = (
  iso: string,
  now: Date = new Date(),
): string => {
  const receiptMs = new Date(iso).getTime();
  // KST 오프셋을 더한 뒤 UTC 판독기로 읽으면 KST 벽시계가 된다
  const kst = new Date(receiptMs + KST_OFFSET_MS);
  const clock = `${pad2(kst.getUTCHours())}:${pad2(kst.getUTCMinutes())}`;

  const elapsedDays = kstDayIndex(now.getTime()) - kstDayIndex(receiptMs);
  if (elapsedDays === 0) return `오늘 ${clock}`;
  if (elapsedDays === 1) return `어제 ${clock}`;
  return `${kst.getUTCMonth() + 1}.${kst.getUTCDate()} ${clock}`;
};

/**
 * 조회수를 한국어 만 단위로 축약한다 (MSG-277 AC 6 — 홈 피드 카드 "조회 {축약}").
 * - 1만 미만: 콤마 표기 (8410 → "8,410")
 * - 1만 이상: 만 단위 소수 첫째 자리 (12000 → "1.2만"), 10 이상은 정수 (124000 → "12만")
 * explore 상세 시트의 formatViewCount(K/M)와 표기 이원화 공존 — 통일은 별도 티켓 (추정 3).
 * 억 단위는 목 데이터 범위 밖이라 미정의.
 */
export const formatViewCountKo = (count: number): string => {
  if (count < 10_000) return count.toLocaleString("ko-KR");
  const man = count / 10_000;
  const rounded = man < 10 ? Math.round(man * 10) / 10 : Math.round(man);
  return `${rounded}만`;
};
