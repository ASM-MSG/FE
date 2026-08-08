import { KAKAO_CALLBACK_PATH } from "@/app/routes";
import { appOrigin, redirectTo } from "@/shared/navigation";
import { createOauthState, oauthStateStorage } from "@/shared/storage";
import kakaoLogo from "../assets/kakao-logo.svg";
import { useDevSocialLogin } from "../api/use-auth-mutations";
import {
  buildKakaoAuthorizeUrl,
  isKakaoLoginEnabled,
} from "../model/kakao-oauth";
import { useLoginModalStore } from "../model/login-modal-store";

/**
 * SOURCE: Figma "Default Button" (node 13686:1508) — 카카오 소셜 로그인 버튼 (343×62 pill).
 * 카카오 브랜드 규정색(컨테이너 #FEE500 = kakao-yellow, 라벨·심벌 #000000 = kakao-black)
 * 고정이라 공용 Button variant로 승격하지 않는다(스펙 재사용 판단 — icon 슬롯·62px 규격도 불일치).
 * 라벨 굵기는 Figma Bold 16/20을 가장 가까운 토큰(text-fm-heading, 16/20) + font-bold로 재현한다.
 *
 * MSG-325: 실 카카오 인가 리다이렉트를 배선했으나(MSG-324 주석이 예고한 핸들러 교체),
 * 인가 코드 → ID 토큰 교환 엔드포인트가 아직 없어 **기본값은 기존 dev 모의 로그인**이다.
 * `VITE_KAKAO_LOGIN_ENABLED=true`인 환경에서만 실 리다이렉트를 탄다 — 서버 교환이 붙기 전에
 * 배포돼도 로그인이 깨지지 않게 하기 위함이다(회귀 방지). 교환 엔드포인트 연결 시
 * 이 분기와 useDevSocialLogin을 함께 제거한다.
 */
/** 인가 요청 시작 — 컴포넌트 상태에 의존하지 않아 모듈 스코프에 둔다 */
const startKakaoLogin = () => {
  // state는 콜백에서 1회 대조할 CSRF 토큰 — 인가 요청 직전에 저장한다
  const state = createOauthState();
  oauthStateStorage.save(state);

  redirectTo(
    buildKakaoAuthorizeUrl({
      jsKey: import.meta.env.VITE_KAKAO_JS_KEY,
      // 카카오 콘솔 등록값과 정확히 일치해야 한다 — origin을 런타임에서 읽어 dev·운영을 함께 만족시킨다
      redirectUri: `${appOrigin()}${KAKAO_CALLBACK_PATH}`,
      state,
    }),
  );
};

export const KakaoLoginButton = () => {
  const closeModal = useLoginModalStore((s) => s.closeModal);
  const { mutate: devSocialLogin, isPending } = useDevSocialLogin();

  const handleClick = () => {
    if (isKakaoLoginEnabled()) {
      startKakaoLogin();
      return;
    }
    devSocialLogin(undefined, { onSuccess: () => closeModal() });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-busy={isPending}
      className="flex h-15.5 w-full items-center justify-center gap-xs rounded-full bg-kakao-yellow text-fm-heading font-bold text-kakao-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
    >
      <img src={kakaoLogo} alt="" className="w-4.5" />
      카카오로 계속하기
    </button>
  );
};
