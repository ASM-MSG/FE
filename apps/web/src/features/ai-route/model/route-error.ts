import { ApiError } from "@/shared/api/api-error";

/**
 * 추천 요청 실패 → UI 반응 매핑 (MSG-488 L5, 스펙 §1-4).
 * 순수 함수 — 정규화는 `shared/api/api-error`의 `ApiError`(status·developCode)를 그대로 쓴다
 * (video-actions `reportFailureNotice` 선례). 로그인 모달·스토어 전이는 호출부가 한다.
 *
 * mutation은 TanStack 기본 `retry: 0`이라 14429(10초 제한)가 자동 재시도로 악화되지 않는다 —
 * 전역 `shouldRetryQuery`는 query 전용이다.
 */
export interface RouteErrorNotice {
  /** 패널에 띄울 문구 — 로그인 필요(401/2403)일 때만 null(에러 표시 없이 모달만) */
  message: string | null;
  /** 재시도 행("다시 시도") 표시 여부 */
  retryable: boolean;
  /** 세션 동안 기능을 끈다 (14503) — 제출 버튼이 계속 비활성 */
  disablesFeature: boolean;
  /** 로그인 모달을 열고 입력 대기로 되돌린다 */
  requiresLogin: boolean;
}

const notice = (
  message: string | null,
  overrides: Partial<Omit<RouteErrorNotice, "message">> = {},
): RouteErrorNotice => ({
  message,
  retryable: true,
  disablesFeature: false,
  requiresLogin: false,
  ...overrides,
});

const GENERIC = notice("동선을 짜지 못했어요. 잠시 후 다시 시도해 주세요");

/** developCode별 문구 — 표에 없는 코드는 공통 실패 안내로 떨어진다 */
const BY_DEVELOP_CODE: Record<number, RouteErrorNotice> = {
  14400: notice(
    "지도를 조금 더 확대하거나 다른 곳으로 옮긴 뒤 다시 시도해 주세요",
  ),
  14401: notice(
    "지도를 조금 더 확대하거나 다른 곳으로 옮긴 뒤 다시 시도해 주세요",
  ),
  // 서버 문구를 그대로 쓴다 (MSG-489, 2026-08-29 사용자 지시) — "다시 시도"를 연속으로 누르면
  // 이 코드만 반복해서 보게 되는데, 종전 문구는 왜 막혔는지를 알려주지 않았다.
  // 서버 응답 문자열을 렌더하지는 않는다(FE 고정 문구 정책, MSG-488 §1-5) — 같은 문장을 상수로 둔다.
  14429: notice("요청이 너무 잦습니다. 잠시 후 다시 시도해주세요"),
  14502: notice("AI가 문장을 이해하지 못했어요. 다시 시도해 주세요"),
  14503: notice("지금은 경로 추천을 쓸 수 없어요", {
    retryable: false,
    disablesFeature: true,
  }),
  2403: notice(null, { retryable: false, requiresLogin: true }),
};

/**
 * 요청을 **보내지 못하고** 끝낸 경우의 안내 (MSG-489 §12).
 * 지도가 정착하지 못해 뷰포트가 서버 상한을 넘을 때, 확정 400(14401)을 대신 맞아 주는 대신
 * 같은 안내로 종결한다 — 사용자가 할 일(확대 후 재시도)이 서버 응답 때와 동일하다.
 */
export const VIEWPORT_TOO_WIDE_NOTICE: RouteErrorNotice =
  BY_DEVELOP_CODE[14401];

export const routeErrorNotice = (error: unknown): RouteErrorNotice => {
  if (!(error instanceof ApiError)) return GENERIC;

  const mapped =
    error.developCode === undefined
      ? undefined
      : BY_DEVELOP_CODE[error.developCode];
  if (mapped) return mapped;

  if (error.status === 401) return BY_DEVELOP_CODE[2403];
  if (error.status === undefined) {
    return notice("네트워크 상태를 확인하고 다시 시도해 주세요");
  }
  return GENERIC;
};
