import kakaoLogo from "../assets/kakao-logo.svg";
import { useDevSocialLogin } from "../api/use-auth-mutations";
import { useLoginModalStore } from "../model/login-modal-store";

/**
 * SOURCE: Figma "Default Button" (node 13686:1508) — 카카오 소셜 로그인 버튼 (343×62 pill).
 * 카카오 브랜드 규정색(컨테이너 #FEE500 = kakao-yellow, 라벨·심벌 #000000 = kakao-black)
 * 고정이라 공용 Button variant로 승격하지 않는다(스펙 재사용 판단 — icon 슬롯·62px 규격도 불일치).
 * 클릭 시 dev 모의 로그인(/api/auth/dev/social-login) — 성공 시에만 모달을 닫는다
 * (MSG-324 기준 11, 구 목 로그인 대체). 실 카카오 OIDC 아님 — 인가 리다이렉트 없이 서버
 * find-or-create뿐이며, 실 OIDC 티켓에서 이 핸들러(useDevSocialLogin 호출)를 교체한다
 * (구 mock 주석의 교체 계약 계승, env 분기 없음 — 스펙 질문 3 기본값). 스토어 배선은 훅
 * 내부 소관. 라벨 굵기는 Figma Bold 16/20을 가장 가까운 토큰(text-fm-heading, 16/20)
 * + font-bold 조합으로 재현한다.
 */
export const KakaoLoginButton = () => {
  const closeModal = useLoginModalStore((s) => s.closeModal);
  const { mutate: devSocialLogin, isPending } = useDevSocialLogin();

  const handleClick = () => {
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
