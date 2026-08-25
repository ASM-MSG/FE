import type { MyReportItem } from "../model/report-history";

/**
 * 내 신고 내역 조회 — **교체 이음새** (MSG-448 기준 18·24·26, 승인 Q3).
 *
 * 서버에 "내가 신고한 내역"을 주는 엔드포인트가 없다(생성 SDK 전수 확인). 있는 것은
 * `GET /api/admin/reports`(`getReports`)뿐인데 ① 관리자 전용이고 ② 쿼리에 신고자 필터가
 * 없어 **호출이 성공한다면 그것이 곧 남의 신고까지 노출되는 사고**다. 그래서 호출하지 않는다.
 *
 * 가짜 신고 목록도 만들지 않는다 — 신고 내역은 "내가 무엇을 신고했는가"라는 사실 진술이라
 * 지어내면 화면이 거짓말을 한다. 대신 빈 목록을 돌려주고 화면이 미연동 사실을 상시 고지한다
 * (기준 26).
 *
 * 실 엔드포인트(`GET /api/users/me/reports`)가 생기면 **이 파일 하나만** 생성 옵션 기반으로
 * 갈아끼우면 되고, 모델·화면·테스트는 무변경이다.
 */
export interface MyReportsQueryResult {
  items: readonly MyReportItem[];
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

/** 참조가 매번 바뀌지 않도록 모듈 상수로 고정 — 화면 재렌더 유발을 막는다 */
const NO_REPORTS: readonly MyReportItem[] = [];

export const useMyReportsQuery = (): MyReportsQueryResult => ({
  items: NO_REPORTS,
  isPending: false,
  isError: false,
  // 조회가 없으므로 재시도할 요청도 없다 — 실 엔드포인트가 붙으면 refetch로 교체된다
  refetch: () => {},
});
