// 이메일 형식 판정은 인증 도메인이 이미 소유한다 — 같은 정규식을 복제하지 않는다 (MSG-542)
import { isEmailFormat } from "@/features/auth/model/email-format";
import { ApiError } from "@/shared/api/api-error";
import type {
  AdminEmailChangeRequestItemResponseDto,
  AdminEmailChangeRequestListResponseDto,
  AdminOrgAccountRequestListResponseDto,
} from "@/shared/api/generated/types.gen";

/**
 * 관리자 계정 운영 파생 (MSG-551) — 발급 폼 판정·상태 라벨·사유 검증·발송 안내·실패 분기.
 * 순수 함수만 둔다 — 플랫폼 무의존(라우터·window 미참조), RN 재사용 대상.
 */

/** 발급 요청 큐 status 필터 3종 = 서버 필터 값 */
export type AccountRequestStatus = "PENDING" | "ISSUED" | "REJECTED";

/** 아이디 변경 큐 status 3종 — 목록 항목 union을 그대로 쓴다 */
export type EmailChangeStatus =
  AdminEmailChangeRequestItemResponseDto["status"];

/** 상태 라벨 색조 — 뷰가 클래스로 옮긴다 */
export type StatusTone =
  | "warning"
  | "success"
  | "error"
  | "primary"
  | "neutral";

export interface StatusView {
  label: string;
  tone: StatusTone;
}

/** 직접 발급 폼 값 — 서버 DTO의 필수 3필드 (연락처는 미전송, 스펙 추정 5) */
export interface IssueFormValues {
  orgName: string;
  contactName: string;
  email: string;
}

/** 담당자 이름 길이 범위 — 서버 DTO 제약 (2~20자) */
const CONTACT_NAME_MIN = 2;
const CONTACT_NAME_MAX = 20;

const isContactNameLength = (value: string): boolean =>
  value.length >= CONTACT_NAME_MIN && value.length <= CONTACT_NAME_MAX;

/**
 * 발급 제출 가능 판정 (AC 1) — 기관명 비공백 · 담당자 2~20자 · 이메일 형식.
 * 길이는 앞뒤 공백을 뺀 값으로 본다(서버가 그 값을 받는다).
 */
export const canSubmitIssue = ({
  orgName,
  contactName,
  email,
}: IssueFormValues): boolean =>
  orgName.trim().length > 0 &&
  isContactNameLength(contactName.trim()) &&
  isEmailFormat(email.trim());

/**
 * 1페이지 초과분 고지 (codex 리뷰 P2) — 목록 3종 공용.
 *
 * 페이지네이션은 이 티켓 범위 밖이다(스펙 추정 6 — 티켓·Figma에 페이지네이션 UI가 없고
 * MVP 규모가 서버 상한 미만, 552·554와 같은 근거). 다만 상한을 넘겼을 때 **조용히
 * 잘리는 것**은 관리자가 "전부 봤다"고 오인하게 만든다 — 초과분이 있으면 몇 건이
 * 보이지 않는지 화면에 알린다. 목록이 상한 미만이면 null(문구 없음).
 */
export const truncationNotice = (
  totalElements: number | undefined,
  shownCount: number,
): string | null =>
  totalElements !== undefined && totalElements > shownCount
    ? `전체 ${totalElements}건 중 최근 ${shownCount}건만 표시합니다 — 나머지 ${totalElements - shownCount}건은 아직 화면에서 볼 수 없어요.`
    : null;

/**
 * 제출용 정규화 (AC 1·4) — 판정이 `trim()`한 값을 보므로 **전송도 같은 값이어야 한다**.
 * 원문을 그대로 보내면 UI가 통과시킨 이메일을 서버가 거절하거나(앞뒤 공백),
 * 기관명·담당자에 공백이 그대로 저장된다 (codex 리뷰 P2).
 */
export const normalizeIssueForm = ({
  orgName,
  contactName,
  email,
}: IssueFormValues): IssueFormValues => ({
  orgName: orgName.trim(),
  contactName: contactName.trim(),
  email: email.trim(),
});

/** 항목별 안내 — 충족한 필드는 null (AC 1) */
export interface IssueFormHints {
  orgName: string | null;
  contactName: string | null;
  email: string | null;
}

/**
 * 미충족 항목별 안내 문구 파생 (AC 1).
 * 빈 값은 "입력해 주세요", 값이 있는데 규칙 위반이면 규칙 자체를 알린다 —
 * 같은 문구로 뭉치면 무엇이 틀렸는지 알 수 없다.
 */
export const issueFormHints = ({
  orgName,
  contactName,
  email,
}: IssueFormValues): IssueFormHints => {
  const trimmedName = contactName.trim();
  const trimmedEmail = email.trim();
  return {
    orgName: orgName.trim().length > 0 ? null : "기관명을 입력해 주세요",
    contactName:
      trimmedName.length === 0
        ? "담당자 이름을 입력해 주세요"
        : isContactNameLength(trimmedName)
          ? null
          : `담당자 이름은 ${CONTACT_NAME_MIN}~${CONTACT_NAME_MAX}자로 입력해 주세요`,
    email:
      trimmedEmail.length === 0
        ? "공식 이메일을 입력해 주세요"
        : isEmailFormat(trimmedEmail)
          ? null
          : "이메일 형식으로 입력해 주세요",
  };
};

/**
 * 계정 상태 뷰 (AC 2a) — `mustChange`가 초기 로그인 전/사용 중의 정본이다(서버 doc).
 * 초기 로그인 전 계정만 비밀번호 재발송 대상이다 (AC 10 · 스펙 추정 3).
 */
export const accountStatusView = (mustChange: boolean): StatusView =>
  mustChange
    ? { label: "초기 로그인 전", tone: "primary" }
    : { label: "사용 중", tone: "success" };

const REQUEST_STATUS_VIEWS: Record<string, StatusView> = {
  PENDING: { label: "대기", tone: "warning" },
  ISSUED: { label: "발급됨", tone: "success" },
  REJECTED: { label: "반려", tone: "error" },
};

/**
 * 발급 요청 status 뷰 (AC 2b). status는 서버 문자열(union 아님)이라 미지 값은 원문을
 * 그대로 보여 준다 — 지어낸 라벨로 덮지 않는다 (approved-event 선례).
 */
export const accountRequestStatusView = (status: string): StatusView =>
  REQUEST_STATUS_VIEWS[status] ?? { label: status, tone: "neutral" };

const EMAIL_CHANGE_STATUS_VIEWS: Record<EmailChangeStatus, StatusView> = {
  PENDING: { label: "대기", tone: "warning" },
  APPROVED: { label: "승인됨", tone: "success" },
  REJECTED: { label: "반려", tone: "error" },
};

/** 아이디 변경 status 뷰 (AC 2b) — 목록 항목 status가 union이라 폴백이 필요 없다 */
export const emailChangeStatusView = (status: EmailChangeStatus): StatusView =>
  EMAIL_CHANGE_STATUS_VIEWS[status];

/**
 * 기관명 폴백 (AC 10) — 이 발급 경로 밖에서 만들어진 계정은 orgName이 null일 수 있다
 * (서버 doc). 빈 칸으로 두면 어떤 계정인지 알 수 없어 폴백 표기를 둔다.
 */
export const orgNameLabel = (orgName: string | null): string =>
  orgName ?? "기관명 미등록";

/** 큐 pill 하나 — 값(=서버 status 필터)과 라벨 */
export interface QueuePillView<TStatus extends string> {
  value: TStatus;
  label: string;
}

interface QueueText<TCounts> {
  /** pill 이름 — 카운트는 응답에서 붙인다 */
  name: string;
  /** 목록 카드 제목 */
  listTitle: string;
  /** 빈 목록 안내 (AC 14) */
  emptyMessage: string;
  countKey: keyof TCounts;
}

/** 발급 요청 상태별 전체 집계 — 필터와 무관하게 응답에 늘 실려 온다 */
export type AccountRequestCounts = Pick<
  AdminOrgAccountRequestListResponseDto,
  "pendingCount" | "issuedCount" | "rejectedCount"
>;

/** 아이디 변경 상태별 전체 집계 */
export type EmailChangeCounts = Pick<
  AdminEmailChangeRequestListResponseDto,
  "pendingCount" | "approvedCount" | "rejectedCount"
>;

/** pill 순서 정본 — 대기 → 처리됨 → 반려 (Figma 15579:2326 순서) */
const ACCOUNT_REQUEST_TEXT: Record<
  AccountRequestStatus,
  QueueText<AccountRequestCounts>
> = {
  PENDING: {
    name: "대기",
    listTitle: "대기 요청",
    emptyMessage: "대기 중인 요청이 없습니다.",
    countKey: "pendingCount",
  },
  ISSUED: {
    name: "발급됨",
    listTitle: "발급된 요청",
    emptyMessage: "발급된 요청이 없습니다.",
    countKey: "issuedCount",
  },
  REJECTED: {
    name: "반려",
    listTitle: "반려된 요청",
    emptyMessage: "반려된 요청이 없습니다.",
    countKey: "rejectedCount",
  },
};

const EMAIL_CHANGE_TEXT: Record<
  EmailChangeStatus,
  QueueText<EmailChangeCounts>
> = {
  PENDING: {
    name: "대기",
    listTitle: "대기 요청",
    emptyMessage: "대기 중인 요청이 없습니다.",
    countKey: "pendingCount",
  },
  APPROVED: {
    name: "승인됨",
    listTitle: "승인된 요청",
    emptyMessage: "승인된 요청이 없습니다.",
    countKey: "approvedCount",
  },
  REJECTED: {
    name: "반려",
    listTitle: "반려된 요청",
    emptyMessage: "반려된 요청이 없습니다.",
    countKey: "rejectedCount",
  },
};

/** 목록 카드 제목·빈 안내 정본 조회 (AC 11·14) */
export const accountRequestQueueText = (status: AccountRequestStatus) =>
  ACCOUNT_REQUEST_TEXT[status];

export const emailChangeQueueText = (status: EmailChangeStatus) =>
  EMAIL_CHANGE_TEXT[status];

/**
 * pill 뷰 파생 (AC 11·13) — 카운트는 필터와 무관한 전체 집계라 그대로 싣는다.
 * 로딩·실패로 카운트가 없으면 숫자를 지어내지 않고 이름만 남긴다 (MSG-554 선례).
 */
const pillViews = <TStatus extends string, TCounts extends object>(
  order: readonly TStatus[],
  text: Record<TStatus, QueueText<TCounts>>,
  counts: TCounts | null,
): QueuePillView<TStatus>[] =>
  order.map((value) => {
    const { name, countKey } = text[value];
    return {
      value,
      label: counts === null ? name : `${name} ${String(counts[countKey])}`,
    };
  });

const ACCOUNT_REQUEST_ORDER: readonly AccountRequestStatus[] = [
  "PENDING",
  "ISSUED",
  "REJECTED",
];

const EMAIL_CHANGE_ORDER: readonly EmailChangeStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
];

export const accountRequestPillViews = (
  counts: AccountRequestCounts | null,
): QueuePillView<AccountRequestStatus>[] =>
  pillViews(ACCOUNT_REQUEST_ORDER, ACCOUNT_REQUEST_TEXT, counts);

export const emailChangePillViews = (
  counts: EmailChangeCounts | null,
): QueuePillView<EmailChangeStatus>[] =>
  pillViews(EMAIL_CHANGE_ORDER, EMAIL_CHANGE_TEXT, counts);

/** 반려 사유 최대 길이 — 서버 DTO 제약 */
const REASON_MAX_LENGTH = 500;

/** 반려 사유 검증 (AC 2c) — 공백뿐이면 확정 불가, 500자 초과도 불가 */
export const canSubmitReason = (reason: string): boolean => {
  const trimmed = reason.trim();
  return trimmed.length > 0 && trimmed.length <= REASON_MAX_LENGTH;
};

/**
 * 발급·승인 결과 안내 (AC 2d) — 초기 비밀번호 **문자열은 응답에 없다**(서버 재료).
 * 화면은 발송 여부만 말한다. 메일이 실패해도 계정과 ISSUED는 유지되므로
 * 복구 경로(재발송)를 함께 안내한다.
 */
export const issuedNotice = (emailSent: boolean): string =>
  emailSent
    ? "계정을 발급했어요. 초기 비밀번호를 공식 이메일로 발송했습니다."
    : "계정은 발급되었으나 메일 발송에 실패했어요. 비밀번호 재발송으로 복구해 주세요.";

/**
 * 재발송 결과 안내 (AC 2d) — 재발송은 재발급이라 이전 비밀번호가 즉시 무효다(서버 doc).
 */
export const resendNotice = (emailSent: boolean): string =>
  emailSent
    ? "초기 비밀번호를 다시 발송했어요. 이전 비밀번호는 무효가 됩니다."
    : "메일 발송에 실패했어요. 잠시 후 다시 시도해 주세요.";

/**
 * 아이디 변경 승인 결과 안내 (AC 2d) — 통지가 실패해도 아이디 교체는 유지된다(서버 doc).
 */
export const emailChangeApprovedNotice = (
  emailSent: boolean,
  email: string,
): string =>
  emailSent
    ? `아이디를 ${email}로 교체하고 새 이메일로 변경 통지를 보냈어요.`
    : `아이디를 ${email}로 교체했어요. 교체는 유지되지만 통지 발송에 실패했습니다.`;

/**
 * 실패 후 관리자가 해야 할 다음 조작 (AC 2e).
 * 안내 문구와 짝이며, 화면은 이 값으로 재조회 버튼·안내 톤을 고른다.
 */
export type AccountFailureNextStep =
  /** 일시 실패 — 같은 조작을 다시 시도한다 */
  | "RETRY"
  /** 이메일 충돌 — 계정 목록에서 발급 여부를 확인한다 */
  | "CHECK_ACCOUNTS"
  /** 대상이 없거나 이미 처리됨 — 목록으로 돌아가 다시 고른다 */
  | "REVIEW_LIST"
  /** 검토 이후 내용이 바뀜 — 같은 요청을 다시 읽고 처리한다 */
  | "REREAD_REQUEST"
  /** 이미 비밀번호를 변경한 계정 — 비밀번호 재설정 흐름을 안내한다 */
  | "PASSWORD_RESET";

export interface AccountFailureNotice {
  message: string;
  nextStep: AccountFailureNextStep;
  /**
   * 서버 진실이 바뀐 실패 — 목록·상세 캐시 재조회 대상.
   * 스테일 행에서 같은 요청을 반복하는 헛 루프를 막는다 (MSG-554 선례).
   */
  staleServerState: boolean;
}

/**
 * developCode → 안내·다음 조작 정본 (AC 2e).
 *
 * 여기 실린 코드는 전부 **서버 진실이 우리 캐시와 다르다는 신호**라 staleServerState가
 * 참이다(목록·상세 재조회 대상). 미등재 코드·네트워크 실패만 재시도로 떨어진다.
 *
 * **이미 처리(1422·1428)와 검토 이후 변경(1426·1429)을 반드시 가른다**: 앞은 재검토가
 * 무의미해 목록으로 돌아가는 것이 다음 조작이고, 뒤는 바뀐 내용을 다시 읽고 같은 요청을
 * 처리해야 한다(서버 설계 취지 — 자동 재시도 금지).
 */
const FAILURE_BRANCHES: readonly [
  /** 같은 안내로 수렴하는 developCode들 — 발급 요청 큐와 아이디 변경 큐가 코드만 갈린다 */
  codes: readonly number[],
  notice: Pick<AccountFailureNotice, "message" | "nextStep">,
][] = [
  // 이미 계정이 있는 이메일 — 직접 발급·요청 승인·아이디 변경 승인 공통 409
  [
    [1409],
    {
      message:
        "이미 계정이 있는 이메일이에요. 계정 목록에서 발급 여부를 확인해 주세요.",
      nextStep: "CHECK_ACCOUNTS",
    },
  ],
  // 없는 사용자 (재발송) — 404
  [
    [1404],
    {
      message: "계정을 찾을 수 없어요. 목록을 다시 불러와 주세요.",
      nextStep: "REVIEW_LIST",
    },
  ],
  // 이미 비밀번호를 변경한 계정 (재발송) — 409
  [
    [1423],
    {
      message:
        "이미 비밀번호를 변경한 계정이에요. 분실이라면 비밀번호 재설정 흐름을 안내해 주세요.",
      nextStep: "PASSWORD_RESET",
    },
  ],
  // 없는 요청 — 404 (발급 요청 1421 / 아이디 변경 1427)
  [
    [1421, 1427],
    {
      message: "요청을 찾을 수 없어요. 목록을 다시 불러와 주세요.",
      nextStep: "REVIEW_LIST",
    },
  ],
  // 이미 처리된 요청 — 409 (발급 요청 1422 / 아이디 변경 1428)
  [
    [1422, 1428],
    {
      message: "이미 처리된 요청이에요. 목록을 다시 불러와 확인해 주세요.",
      nextStep: "REVIEW_LIST",
    },
  ],
  // 검토 이후 요청 변경 — 409 (발급 요청 1426 / 아이디 변경 1429)
  [
    [1426, 1429],
    {
      message:
        "검토 이후 요청 내용이 변경됐어요. 다시 불러와 확인한 뒤 처리해 주세요.",
      nextStep: "REREAD_REQUEST",
    },
  ],
];

const FAILURE_BY_CODE = new Map(
  FAILURE_BRANCHES.flatMap(([codes, notice]) =>
    codes.map((code) => [code, notice] as const),
  ),
);

/** 실패 분기 파생 (AC 2e) — developCode를 안내 문구와 다음 조작으로 옮긴다 */
export const accountFailureNotice = (error: unknown): AccountFailureNotice => {
  const developCode = error instanceof ApiError ? error.developCode : undefined;
  const matched =
    developCode === undefined ? undefined : FAILURE_BY_CODE.get(developCode);

  return matched === undefined
    ? {
        message: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
        nextStep: "RETRY",
        staleServerState: false,
      }
    : { ...matched, staleServerState: true };
};
