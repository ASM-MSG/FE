/**
 * 영상 신고 유형 목데이터 (MSG-317 AC 14) — 신고 API는 백엔드 명세 부재(2026-08-06
 * 스냅샷)라 mock. 실 API 교체 비용 최소화를 위해 백엔드 DTO 관례 필드명
 * (reportType 코드 + label)으로 구성한다 (티켓 확정) — 명세 확정 시 값만 대체.
 */

export type ReportTypeCode = "HARMFUL" | "SEXUAL" | "SPAM" | "PRIVACY" | "ETC";

export interface ReportTypeOption {
  reportType: ReportTypeCode;
  label: string;
}

export const REPORT_TYPES: ReportTypeOption[] = [
  { reportType: "HARMFUL", label: "유해·혐오" },
  { reportType: "SEXUAL", label: "음란·선정성" },
  { reportType: "SPAM", label: "스팸·광고" },
  { reportType: "PRIVACY", label: "개인정보 노출" },
  { reportType: "ETC", label: "기타" },
];
