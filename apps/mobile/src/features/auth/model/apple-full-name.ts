/**
 * 애플 로그인 `fullName` 조립·보관 (MSG-601 L1·L8) — 순수 함수.
 *
 * 애플은 이름을 `{ familyName, givenName, … }`으로 쪼개 주고 **첫 승인에만** 준다(재승인은 null).
 * 서버(`OidcLoginRequestDto.fullName`)는 한 문자열을 받아 새 계정의 닉네임으로만 쓴다(BE 계약 4항).
 * 플랫폼 API·라우터 무의존 (RN 경계 — 순수 모델).
 */

interface AppleNameParts {
  familyName?: string | null;
  givenName?: string | null;
}

const trimmed = (value: string | null | undefined): string =>
  value?.trim() ?? "";

/**
 * 성+이름을 **공백 없이** 붙인다(한국어 이름 관례). 둘 다 비면 `undefined` — body에서 필드가 빠진다.
 */
export const assembleFullName = (
  name: AppleNameParts | null | undefined,
): string | undefined => {
  const joined = trimmed(name?.familyName) + trimmed(name?.givenName);
  return joined === "" ? undefined : joined;
};

/**
 * 첫 시도의 이름을 프로세스 동안 들고 있다가, 서버 오류 뒤 재시도에서 애플이 이름을 주지 않아도
 * 다시 실어 보낸다(BE 권장 — 없으면 닉네임이 `필맵러XXXX`로 만들어진다). 성공 후 비우지 않는다:
 * 기존 계정에 온 fullName은 서버가 무시한다(A7).
 */
export const createFullNameRetainer = () => {
  let retained: string | undefined;
  return {
    remember: (fresh: string | undefined): string | undefined => {
      if (fresh !== undefined) retained = fresh;
      return retained;
    },
  };
};
