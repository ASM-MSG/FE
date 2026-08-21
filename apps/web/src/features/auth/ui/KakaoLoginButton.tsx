import { KAKAO_CALLBACK_PATH } from "@/app/routes";
import { appOrigin, redirectTo } from "@/shared/navigation";
import { createOauthState, oauthStateStorage } from "@/shared/storage";
import kakaoLogo from "../assets/kakao-logo.svg";
import { buildKakaoAuthorizeUrl } from "../model/kakao-oauth";

/** 로그인 시작 — 컴포넌트 상태에 의존하지 않아 모듈 스코프에 둔다 */
const startKakaoLogin = () => {
  // state는 콜백에서 1회 대조할 CSRF 토큰 — 진입점 이동 직전에 저장한다
  const state = createOauthState();
  oauthStateStorage.save(state);

  redirectTo(
    buildKakaoAuthorizeUrl({
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
      // 카카오 콘솔 등록값과 정확히 일치해야 한다 — origin을 런타임에서 읽어 dev·운영을 함께 만족시킨다.
      // 콜백에서 코드를 교환할 때도 이 값을 그대로 다시 보낸다
      redirectUri: `${appOrigin()}${KAKAO_CALLBACK_PATH}`,
      state,
    }),
  );
};

/**
 * SOURCE: Figma "Default Button" (node 13686:1508) — 카카오 소셜 로그인 버튼 (343×62 pill).
 * 카카오 브랜드 규정색(컨테이너 #FEE500 = kakao-yellow, 라벨·심벌 #000000 = kakao-black)
 * 고정이라 공용 Button variant로 승격하지 않는다(스펙 재사용 판단 — icon 슬롯·62px 규격도 불일치).
 * 라벨 굵기는 Figma Bold 16/20을 가장 가까운 토큰(text-fm-heading, 16/20) + font-bold로 재현한다.
 *
 * MSG-325: 클릭은 **서버 로그인 진입점으로 이동**하는 것뿐이다(MSG-324 주석이 예고한
 * 핸들러 교체). 카카오 SDK·앱 키·scope=openid·nonce는 전부 서버가 다루므로 프론트에 없다 —
 * REST API 키가 클라이언트로 나갈 경로 자체가 없다. 페이지를 떠나므로 pending 상태·모달
 * 닫기가 필요 없고, 로그인 완결은 콜백 경로(KakaoCallbackPage)가 맡는다.
 */
export const KakaoLoginButton = () => (
  <button
    type="button"
    onClick={startKakaoLogin}
    className="flex h-15.5 w-full items-center justify-center gap-xs rounded-full bg-kakao-yellow text-fm-heading font-bold text-kakao-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <img src={kakaoLogo} alt="" className="w-4.5" />
    카카오로 계속하기
  </button>
);
