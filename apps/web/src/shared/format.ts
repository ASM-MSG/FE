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

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** 종성 ㄹ의 인덱스 — 받침이 ㄹ이면 "으로"가 아니라 "로"를 쓴다 */
const JONGSEONG_RIEUL = 8;

/**
 * 조사 "(으)로" 확정 — 받침 없음·ㄹ 받침은 "로", 나머지 받침은 "으로".
 * 한글 음절이 아닌 끝 글자는 받침 없음으로 본다(이름은 한글이 정본이라 폴백 경로다).
 * MSG-489의 route-mentioned-area 로컬 함수였고, MSG-546 위저드 CTA
 * ("{이벤트명}으로 계속")가 두 번째 소비처가 되며 shared로 올렸다 (formatDuration 선례).
 */
export const euroJosa = (name: string): string => {
  const code = name.charCodeAt(name.length - 1);
  if (Number.isNaN(code) || code < HANGUL_BASE || code > HANGUL_LAST) {
    return "로";
  }
  const jongseong = (code - HANGUL_BASE) % 28;
  return jongseong === 0 || jongseong === JONGSEONG_RIEUL ? "로" : "으로";
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
