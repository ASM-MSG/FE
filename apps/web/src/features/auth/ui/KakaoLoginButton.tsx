import kakaoLogo from "../assets/kakao-logo.svg";
import { useAuthStore } from "../model/auth-store";
import { useLoginModalStore } from "../model/login-modal-store";

/**
 * SOURCE: Figma "Default Button" (node 13686:1508) — 카카오 소셜 로그인 버튼 (343×62 pill).
 * 카카오 브랜드 규정색(컨테이너 #FEE500 = kakao-yellow, 라벨·심벌 #000000 = kakao-black)
 * 고정이라 공용 Button variant로 승격하지 않는다(스펙 재사용 판단 — icon 슬롯·62px 규격도 불일치).
 * 클릭 시 목 로그인 + 모달 닫힘 (MSG-46 후속 3 P2 — 구 "무동작(AC 6)" 대체). 실제 OAuth
 * 아님 — 인가 리다이렉트·토큰 없이 상태 전환뿐이며, 연동은 별도 티켓에서 이 핸들러를 교체한다.
 * 두 스토어 모두 같은 feature(auth)의 model이라 직접 구독한다 — 유일한 소비 맥락이
 * LoginModal(G7)이므로 콜백 주입으로 일반화하지 않는다. 라벨 굵기는 Figma Bold 16/20을
 * 가장 가까운 토큰(text-fm-heading, 16/20) + font-bold 조합으로 재현한다.
 */
export const KakaoLoginButton = () => {
  const login = useAuthStore((s) => s.login);
  const closeModal = useLoginModalStore((s) => s.closeModal);

  const handleClick = () => {
    login();
    closeModal();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-15.5 w-full items-center justify-center gap-xs rounded-full bg-kakao-yellow text-fm-heading font-bold text-kakao-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <img src={kakaoLogo} alt="" className="w-4.5" />
      카카오로 계속하기
    </button>
  );
};
