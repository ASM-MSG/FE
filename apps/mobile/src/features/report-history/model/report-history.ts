import { formatKstDate } from "../../../shared/format";

/**
 * 내 신고 내역의 상태 판정 + 표시 파생 (MSG-448 기준 19~23).
 * 순수 모델 — 플랫폼 API·react·라우터 무의존.
 *
 * **`features/video-actions/model/report.ts`와 매핑 방향이 반대다**: 그쪽은 제출용
 * `FE 사유 id → 서버 enum`(3종만 노출)이고, 이쪽은 열람용 `서버 enum → 한국어 라벨`이다.
 * 서버는 다른 클라이언트가 넣은 `COPYRIGHT`·`OTHER`도 돌려줄 수 있어 5종 전부가 필요하다.
 * 두 매핑이 한 파일에 살면 방향이 헷갈리므로 열람용은 이 슬라이스가 소유한다.
 *
 * 화면은 이 판정·파생만 읽는 얇은 스위치다 — 서버 엔드포인트가 아직 없어(스펙 실측 A)
 * 기본 경로가 빈 목록이지만, 로딩·실패·목록 경로는 테스트가 fixture로 구동해 죽은 코드가
 * 되지 않는다.
 */

export type ReportReason =
  | "INAPPROPRIATE"
  | "PRIVACY"
  | "SPAM"
  | "COPYRIGHT"
  | "OTHER";

export type ReportStatus = "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";

/**
 * 내 신고 1건. 서버 `AdminReportItemResponseDto`의 **부분집합** 형태로 미리 맞춰 둔다 —
 * `GET /api/users/me/reports`가 생기면 매핑이 항등에 가까워진다.
 * `reason`·`status`가 넓은 `string`인 이유는 서버에 항목이 추가돼도 화면이 죽지 않아야
 * 하기 때문이다 (기준 21·22의 폴백).
 */
export interface MyReportItem {
  reportId: number;
  videoId: number;
  /** 영상 소유자 닉네임 — 탈퇴·삭제로 비어 올 수 있다 */
  videoOwnerNickname: string | null;
  reason: string;
  status: string;
  /** 신고 접수 시각 — 타임존 마커 없는 UTC 저장값 */
  createdAt: string;
}

/** 목록 영역의 배타 상태 (기준 19) */
export type ReportListState = "loading" | "error" | "empty" | "list";

/**
 * 로딩·실패·빈·목록을 한 값으로 판정한다 (기준 19).
 * 실패가 로딩보다 우선한다 — 재시도 왕복 중에 실패 안내와 [다시 시도]가 사라졌다
 * 다시 나타나면 사용자가 재시도를 두 번 누르게 된다.
 */
export const resolveReportListState = (input: {
  isPending: boolean;
  isError: boolean;
  items: readonly MyReportItem[];
}): ReportListState => {
  if (input.isError) return "error";
  if (input.isPending) return "loading";
  return input.items.length === 0 ? "empty" : "list";
};

/** 열람용 사유 라벨 — 목록 행이 좁아 제출 화면(REPORT_REASONS)보다 축약형이다 (승인 Q5) */
const REPORT_REASON_LABELS = {
  INAPPROPRIATE: "부적절한 콘텐츠",
  PRIVACY: "사생활 침해",
  SPAM: "스팸·도배",
  COPYRIGHT: "저작권 침해",
  OTHER: "기타",
} as const satisfies Record<ReportReason, string>;

/** 모르는 사유가 와도 칸을 비우지 않는다 (기준 21) */
export const REPORT_REASON_FALLBACK_LABEL = "기타";

export const reportReasonLabel = (reason: string): string =>
  REPORT_REASON_LABELS[reason as ReportReason] ?? REPORT_REASON_FALLBACK_LABEL;

const REPORT_STATUS_LABELS = {
  PENDING: "접수됨",
  REVIEWING: "검토 중",
  RESOLVED: "조치 완료",
  REJECTED: "반려됨",
} as const satisfies Record<ReportStatus, string>;

/** 모르는 상태는 가장 보수적인 "접수됨"으로 (기준 22) — 처리됐다고 단정하지 않는다 */
export const REPORT_STATUS_FALLBACK_LABEL = "접수됨";

export const reportStatusLabel = (status: string): string =>
  REPORT_STATUS_LABELS[status as ReportStatus] ?? REPORT_STATUS_FALLBACK_LABEL;

/** 신고 대상 표기 (기준 20) — 닉네임이 없으면 영상 번호로 대체한다 */
export const reportTargetLabel = (
  item: Pick<MyReportItem, "videoOwnerNickname" | "videoId">,
): string =>
  item.videoOwnerNickname === null || item.videoOwnerNickname === ""
    ? `영상 #${item.videoId}`
    : `${item.videoOwnerNickname}님의 영상`;

/**
 * 신고 시점 표기 (기준 23) — KST 기준 "YYYY.MM.DD".
 * 서버 `createdAt`은 타임존 마커 없는 UTC라 날짜부를 그대로 자르면 하루가 밀린다
 * (가입일 표기가 같은 함정을 겪었다 — 그래서 변환이 `shared/format`에 있다).
 */
export const formatReportedAt = (iso: string): string => formatKstDate(iso);

/** 행 1개가 그리는 4필드 (기준 20) */
export interface ReportRowView {
  target: string;
  reason: string;
  reportedAt: string;
  status: string;
}

export const toReportRowView = (item: MyReportItem): ReportRowView => ({
  target: reportTargetLabel(item),
  reason: reportReasonLabel(item.reason),
  reportedAt: formatReportedAt(item.createdAt),
  status: reportStatusLabel(item.status),
});
