import { Platform } from "react-native";
import {
  assembleFullName,
  createFullNameRetainer,
} from "../model/apple-full-name";
import { createAppleNonce } from "../model/apple-nonce";
import { APPLE_UNAVAILABLE } from "../model/social-login-failure";
import type { OidcCredential } from "./oidc-login-mutation";

/**
 * 애플 로그인 네이티브 모듈 격리 경계 (MSG-601 L9) — `expo-apple-authentication`·`expo-crypto`를
 * 만지는 유일한 지점.
 *
 * **정적 import를 쓰지 않는다 (MSG-429 실기 환류, kakao-adapter 승계).** 네이티브 모듈이 빠진
 * 빌드에서는 import 체인이 통째로 평가 실패해 앱 전체가 렌더되지 않는다 — 이 파일은 로그인 화면 →
 * `app/login`으로 이어지는 정적 체인 위에 있어 같은 위험에 노출된다. 로드를 함수 안으로 미뤄
 * "애플 로그인만 실패"까지로 피해를 가둔다. 지연 로드는 vitest 격리에도 그대로 유효하다
 * (apple-adapter.test.ts가 양방향 고정).
 *
 * 흐름(BE 계약 MSG-594): nonce 원문 생성 → SHA-256 해시를 시트에 → identityToken·authorizationCode·
 * fullName(성+이름 조립)을 mutation에 넘긴다. 취소(`ERR_REQUEST_CANCELED`)는 그대로 전파 — 판정은
 * `social-login-failure`가 한다.
 */
type AppleAuthModule = typeof import("expo-apple-authentication");
type CryptoModule = typeof import("expo-crypto");

/** 브릿지 거절과 같은 형태(`Error.code`)로 맞춰 판정 함수가 한 축만 보게 한다 */
const codedError = (code: string, message: string): Error =>
  Object.assign(new Error(message), { code });

/**
 * 첫 시도의 fullName을 프로세스 동안 보관 — 서버 오류로 실패한 뒤 재시도하면 애플이 이름을 다시 주지
 * 않으므로 여기서 다시 실어 보낸다(L8, A7).
 */
const fullNameRetainer = createFullNameRetainer();

export const requestAppleCredential = async (): Promise<OidcCredential> => {
  if (Platform.OS !== "ios") {
    // 버튼이 iOS에서만 렌더되므로 도달 불가 경로지만, 어댑터가 자기 전제를 스스로 지킨다(A8)
    throw codedError(
      APPLE_UNAVAILABLE,
      "Apple 로그인은 iOS에서만 사용할 수 있습니다.",
    );
  }
  const [apple, crypto]: [AppleAuthModule, CryptoModule] = await Promise.all([
    import("expo-apple-authentication"),
    import("expo-crypto"),
  ]);
  const { raw, hashed } = await createAppleNonce({
    randomBytes: crypto.getRandomBytes,
    sha256: (text) =>
      crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, text),
  });
  const credential = await apple.signInAsync({
    requestedScopes: [
      apple.AppleAuthenticationScope.FULL_NAME,
      apple.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashed,
  });
  return {
    idToken: credential.identityToken,
    nonce: raw,
    authorizationCode: credential.authorizationCode,
    // `credential.user`는 애플이 이 앱에 대해 고정 발급하는 사용자 식별자 — 계정별 보관 키(codex P2)
    fullName: fullNameRetainer.remember(
      credential.user,
      assembleFullName(credential.fullName),
    ),
  };
};
