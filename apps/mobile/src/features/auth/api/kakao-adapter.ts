import { KAKAO_NOT_CONFIGURED } from "../model/kakao-login-failure";

/**
 * 카카오 네이티브 SDK 격리 경계 (기준 5·7·8) — 네이티브 모듈을 만지는 유일한 지점.
 *
 * **정적 import를 쓰지 않는다 (MSG-429 실기 환류).** 네이티브 모듈이 빠진 APK에서는
 * import 체인이 통째로 평가 실패해 앱 전체가 렌더되지 않는다 — `expo-notifications`에서
 * 실제로 겪은 사고다(`notifications-adapter.ts` 참조). 이 파일은 로그인 화면 → `app/login`
 * 으로 이어지는 정적 체인 위에 있어 같은 위험에 노출된다. 로드를 함수 안으로 미뤄
 * "카카오 로그인만 실패"까지로 피해를 가둔다.
 *
 * 지연 로드는 vitest 격리에도 그대로 유효하다 — 테스트가 `@react-native-kakao/*`를
 * 파싱할 일이 없다(kakao-adapter.test.ts가 양방향 고정).
 *
 * 방식은 스펙 확정대로 **네이티브 SDK → ID 토큰 → `POST /api/auth/oauth/kakao`**다.
 * 서버 주도 웹 플로우(`/authorize` → `/code`)는 nonce가 HttpOnly 쿠키로 인앱 브라우저
 * 저장소에 갇혀 앱에서 완결되지 않는다(생성 SDK 문서도 앱은 이 경로를 쓰라고 명시).
 */
type KakaoCoreModule = typeof import("@react-native-kakao/core");
type KakaoUserModule = typeof import("@react-native-kakao/user");

const MISSING_APP_KEY =
  "EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY가 설정되지 않았습니다 — apps/mobile/.env(.env.example 참조)를 확인하세요.";

/** 브릿지 거절과 같은 형태(`Error.code`)로 맞춰 판정 함수가 한 축만 보게 한다 */
const codedError = (code: string, message: string): Error =>
  Object.assign(new Error(message), { code });

let sdkPromise: Promise<KakaoUserModule> | null = null;

/**
 * SDK 로드 + 초기화 1회. 실패하면 캐시를 비워 다음 탭이 다시 시도할 수 있게 한다 —
 * 거부된 프로미스를 남기면 재시도(동작 요구)가 영영 같은 실패를 되돌려준다.
 */
const loadKakaoSdk = (nativeAppKey: string): Promise<KakaoUserModule> =>
  (sdkPromise ??= (async () => {
    const [core, user]: [KakaoCoreModule, KakaoUserModule] = await Promise.all([
      import("@react-native-kakao/core"),
      import("@react-native-kakao/user"),
    ]);
    await core.initializeKakaoSDK(nativeAppKey);
    return user;
  })().catch((error: unknown) => {
    sdkPromise = null;
    throw error;
  }));

/**
 * 카카오 로그인 → OIDC ID 토큰. 카카오톡이 깔려 있으면 앱 전환, 아니면 SDK가 카카오계정
 * 웹 로그인으로 떨어뜨린다(분기는 SDK 내부 판단).
 *
 * `nonce`는 넘기지 않는다 — 네이티브 경로의 서버 검증은 ID 토큰 자체 검증이고 대조할
 * 저장 nonce가 없다(쿠키를 심는 쪽은 웹 `/authorize` 경로뿐, 스펙 승인 Q4).
 *
 * ID 토큰이 없을 수 있다(카카오 콘솔 OpenID Connect 미활성). 그 판정은 호출부가 한다 —
 * 여기서 던지면 순수 vitest로 고정할 수 없는 자리에 계약이 갇힌다.
 */
export const requestKakaoIdToken = async (): Promise<string | undefined> => {
  const nativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY;
  if (!nativeAppKey) {
    throw codedError(KAKAO_NOT_CONFIGURED, MISSING_APP_KEY);
  }
  const user = await loadKakaoSdk(nativeAppKey);
  const { idToken } = await user.login();
  return idToken;
};
