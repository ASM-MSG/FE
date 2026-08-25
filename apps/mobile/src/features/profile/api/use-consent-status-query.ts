import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getConsentStatusOptions } from "../../../shared/api/query-options";

/**
 * 가입 약관 동의 상태 조회 (기준 9·10) — `GET /api/users/me/consents` 생성 옵션.
 * 캐시 원본은 **봉투 그대로** 둔다 — 마케팅 토글 mutation이 같은 키에 낙관 값·서버 응답을
 * `setQueryData`로 직접 쓰기 때문이다(MSG-426 preferences 선례). 언랩은 select에서만.
 * 화면 진입마다 이 조회가 정본이라 화면을 벗어났다 다시 들어오면 서버 값이 복원된다 (기준 14).
 */
export const useConsentStatusQuery = () =>
  useQuery({ ...getConsentStatusOptions(), select: unwrapEnvelope });
