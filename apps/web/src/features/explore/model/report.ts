/**
 * 영상 신고 도메인 로직 — 순수 함수/상수 + 제출 목업 (MSG-116 L1~L4).
 * 플랫폼 API(window·fetch 등)를 참조하지 않는다 — RN 재사용 대상.
 * 서버 연동은 이 티켓의 제외 범위이므로 submitReport는 지연 없이 성공 처리한다.
 */

/** 신고 사유 옵션. id는 안정 키, label은 화면 노출 문구. [L1] */
export const REPORT_REASONS = [
  { id: "content", label: "부적절한 콘텐츠(선정성·폭력성 등)" },
  { id: "privacy", label: "사생활 침해(얼굴·번호판 등 노출)" },
  { id: "spam", label: "스팸 또는 도배성 콘텐츠" },
] as const;

/** 신고 사유 id 유니온 */
export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

/**
 * 신고 제출 가능 여부를 판정한다. [L2·L3]
 * 사유가 선택되지 않았거나(null) 목록에 없는 id면 false, 유효한 id면 true.
 */
export const canSubmitReport = (reasonId: string | null): boolean =>
  reasonId !== null && REPORT_REASONS.some((r) => r.id === reasonId);

/**
 * 신고 제출(목업). [L4]
 * 선택된 사유 id를 받아 로컬에서 성공 결과를 반환한다 —
 * 서버/네트워크·플랫폼 API를 호출하지 않는다.
 */
export const submitReport = (reasonId: string): Promise<{ ok: true }> => {
  // 서버 미연동 목업 — 실제 API 연동 시 reasonId를 전송한다.
  void reasonId;
  return Promise.resolve({ ok: true });
};
