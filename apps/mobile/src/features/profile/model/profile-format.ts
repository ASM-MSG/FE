import { formatKstDate } from "../../../shared/format";

/**
 * 프로필 표시 포맷 유틸 (MSG-306 → MSG-426 웹 KST 보정판 포팅) — parity 테스트가 고정한다.
 * 플랫폼(window·router) 무의존.
 *
 * [MSG-448] KST 보정 로직 자체는 `shared/format.ts`의 `formatKstDate`로 올라갔다 —
 * 신고 내역(features/report-history)이 같은 변환을 쓰게 됐고, 교차 feature import는
 * FSD 위반이기 때문이다. 표시 계약(가입일 = KST YYYY.MM.DD)과 웹 원본 동등성은
 * profile-format.test.ts가 그대로 고정한다.
 */

/**
 * 가입일 ISO 문자열을 KST 기준 "YYYY.MM.DD"로 변환한다 (예: "2026-01-12" → "2026.01.12").
 * 서버 `createdAt`은 타임존 마커 없는 UTC 저장값이라 날짜부를 그대로 자르면 KST 00~09시
 * 가입자의 가입일이 하루 전으로 밀린다 — 구 모바일 구현이 이 결함을 갖고 있었다.
 */
export const formatJoinedDate = (iso: string): string => formatKstDate(iso);
