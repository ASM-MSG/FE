import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import {
  APP_CLIENT_TYPE,
  CLIENT_TYPE_HEADER,
  DEVICE_ID_HEADER,
} from "../../../shared/api/auth-pipeline";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { resetSessionCache } from "../../../shared/api/reset-session-cache";
import { oauthLogin } from "../../../shared/api/sdk";
import {
  MISSING_ID_TOKEN,
  type SocialProvider,
} from "../model/social-login-failure";

export type { SocialProvider } from "../model/social-login-failure";

/**
 * 소셜(OIDC) 로그인 mutation 옵션 (MSG-444 기준 4·5·6 → MSG-601에서 provider 매개화) —
 * `POST /api/auth/oauth/{provider}`. 네이티브 SDK가 교환까지 마친 ID 토큰을 서버에 넘기면 우리
 * 토큰이 발급된다. 카카오·애플은 서버도 같은 DTO·같은 서비스로 처리하므로 옵션 팩토리 하나로 둔다 —
 * 두 사본은 nose 중복 게이트에 걸리고 3am에 갈라진다(A1).
 * 앱 규약(`X-Client-Type: app`)이라 refreshToken이 body로 내려오고, 기기 식별자는
 * 응답 **헤더** `X-Device-Id`로 온다 — 그래서 생성 mutation 옵션 대신 SDK를 직접 호출한다
 * (use-dev-login 선례 — 생성 옵션은 data만 돌려주고 Response를 감춘다).
 *
 * 훅이 아니라 옵션 팩토리로 두는 이유: RN 렌더 테스트 인프라가 없어 테스트가 이 객체를
 * `MutationObserver`로 직접 구동한다. 네이티브 SDK·보안 저장소·라우터를 전부 주입받는 것도
 * 같은 이유다 — `auth-session`을 import하면 expo-secure-store가 파싱 단계에서 죽는다
 * (MSG-426에서 확립한 구조).
 */

interface IssuedSession {
  tokens: { accessToken: string; refreshToken: string | null };
  /** 서버가 새로 발급했을 때만 헤더로 온다 */
  deviceId: string | null;
}

/**
 * 네이티브 어댑터가 돌려주는 자격 — `OidcLoginRequestDto`의 앱 쪽 재료.
 * 카카오는 `idToken`만, 애플은 `nonce` 원문·`authorizationCode`(매번)·`fullName`(첫 승인)까지.
 * `undefined` 필드는 JSON에서 빠지므로 카카오 body는 `{ idToken }` 그대로다.
 */
export interface OidcCredential {
  idToken: string | null | undefined;
  nonce?: string;
  authorizationCode?: string | null;
  fullName?: string;
}

export interface OidcLoginDeps {
  provider: SocialProvider;
  queryClient: QueryClient;
  /** 네이티브 SDK 경계 — kakao-adapter / apple-adapter */
  requestCredential: () => Promise<OidcCredential>;
  setTokens: (tokens: {
    accessToken: string;
    refreshToken: string | null;
  }) => Promise<void>;
  setDeviceId: (deviceId: string) => Promise<void>;
  /** 로그인 후 이동 — 라우팅은 훅이 주입한다 (RN 경계) */
  onLoggedIn: () => void;
}

export const oidcLoginMutationOptions = ({
  provider,
  queryClient,
  requestCredential,
  setTokens,
  setDeviceId,
  onLoggedIn,
}: OidcLoginDeps): UseMutationOptions<IssuedSession, Error, void> => ({
  mutationFn: async () => {
    const { idToken, nonce, authorizationCode, fullName } =
      await requestCredential();
    if (!idToken) {
      // 카카오 콘솔 OpenID Connect 미활성 / 애플 identityToken null — 서버를 부를 재료가 없다.
      // 판정·사용자 문구는 `code`로 갈리지만 message는 로그(크래시·Sentry)에서 직접 읽히므로
      // provider별로 쓴다 — 애플 실패를 카카오 콘솔 문제로 오인하지 않게 (PR #156 리뷰 반영)
      throw Object.assign(
        new Error(
          provider === "kakao"
            ? "카카오에서 ID 토큰을 받지 못했습니다 — 콘솔의 OpenID Connect 활성화를 확인하세요."
            : "Apple에서 identityToken을 받지 못했습니다.",
        ),
        { code: MISSING_ID_TOKEN },
      );
    }
    const { data, response } = await oauthLogin({
      path: { provider },
      body: {
        idToken,
        nonce,
        authorizationCode: authorizationCode ?? undefined,
        fullName,
      },
      headers: { [CLIENT_TYPE_HEADER]: APP_CLIENT_TYPE },
      throwOnError: true,
    });
    return {
      tokens: unwrapEnvelope(data),
      deviceId: response.headers.get(DEVICE_ID_HEADER),
    };
  },
  onSuccess: async ({ tokens, deviceId }) => {
    await setTokens(tokens);
    if (deviceId !== null) {
      await setDeviceId(deviceId);
    }
    // 이전 세션 캐시가 다음 사용자에게 새지 않도록 비운다. `clear()`가 아니라
    // resetSessionCache인 이유는 그 JSDoc 참조 — clear()는 구독 중이던 동의 게이트
    // 옵저버를 파괴된 Query에 묶어 게이트를 영영 못 뜨게 했다 (MSG-422 P0 환류).
    // 폐기는 동기, 재조회만 비동기다 — 로그인 완료를 재조회에 묶지 않는다.
    void resetSessionCache(queryClient);
    onLoggedIn();
  },
});
