/**
 * 반려 항목 코드 → 화면 라벨 (MSG-549 AC 7).
 *
 * 계약은 `reasonCodes: PERIOD | AREA | IMAGE | INFO`(1개 이상) + `reasonText`(자유 서술)다 —
 * 화면의 "반려 항목"은 코드를 라벨로 옮긴 것이고, 자유 서술은 "검토 의견" 필드가 정본이다.
 * 코드가 plain string이라 미지 값은 원문을 그대로 실어 항목 줄이 비지 않게 한다.
 *
 * 순수 함수뿐 — 플랫폼(window·router)·지도 SDK 무의존이라 RN 재사용 대상이다.
 */
export const REJECTION_REASON_LABELS: Record<string, string> = {
  PERIOD: "행사 기간",
  AREA: "위치 영역",
  IMAGE: "홍보 이미지",
  INFO: "행사 정보",
};

/** 반려 항목 라벨 한 줄 — 서버가 보낸 순서를 유지하고 " · "로 잇는다 (AC 7) */
export const rejectionReasonLabels = (codes: readonly string[]): string =>
  codes.map((code) => REJECTION_REASON_LABELS[code] ?? code).join(" · ");
