import { ApiError } from "@/shared/api/api-error";

/**
 * 콘솔 인증 폼의 실패 표출 (MSG-542 AC 3·8·12) — 로그인·비밀번호 설정·재설정이 공유한다.
 *
 * 로그인 자격 불일치·재설정 토큰 만료의 developCode는 **openapi에 미문서화**라 코드 분기를
 * 만들지 않고 서버 봉투 message를 그대로 보인다(스펙 리스크 참조). 문서화된 코드는
 * initial의 2446(이미 설정 완료)·2445(소셜 계정)뿐이고, 2446만 전용 안내가 있다(추정 9).
 */

/** 응답이 없어 서버 판정을 모르는 실패 — `ApiError.status`가 없는 경우 */
export const NETWORK_ERROR_MESSAGE =
  "서버에 연결하지 못했어요. 네트워크 상태를 확인해주세요";

/** 서버가 거절했지만 message가 비어 온 경우 — 빈 문구를 폼에 노출하지 않는다 */
const FALLBACK_ERROR_MESSAGE =
  "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요";

/** 이미 비밀번호 설정을 마친 계정의 initial 거절 코드 (openapi 명시) */
export const PASSWORD_ALREADY_SET_CODE = 2446;

export const authErrorMessage = (error: unknown): string => {
  // status가 없으면 응답 자체가 없었다는 뜻이다 — ApiError로 정규화되지 않은 예외도 같다
  if (!(error instanceof ApiError) || error.status === undefined) {
    return NETWORK_ERROR_MESSAGE;
  }
  return error.message !== "" ? error.message : FALLBACK_ERROR_MESSAGE;
};

export const isPasswordAlreadySetError = (error: unknown): boolean =>
  error instanceof ApiError && error.developCode === PASSWORD_ALREADY_SET_CODE;
