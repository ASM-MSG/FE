import kakaoLogo from "../assets/kakao-logo.svg";

/**
 * SOURCE: Figma "Default Button" (node 13686:1508) — 카카오 소셜 로그인 버튼 (343×62 pill).
 * 카카오 브랜드 규정색(컨테이너 #FEE500 = kakao-yellow, 라벨·심벌 #000000 = kakao-black)
 * 고정이라 공용 Button variant로 승격하지 않는다(스펙 재사용 판단 — icon 슬롯·62px 규격도 불일치).
 * OAuth 연동은 별도 티켓 — onClick 없이 의도된 무동작(AC 6). 라벨 굵기는 Figma Bold 16/20을
 * 가장 가까운 토큰(text-fm-heading, 16/20) + font-bold 조합으로 재현한다.
 */
export const KakaoLoginButton = () => (
  <button
    type="button"
    className="flex h-15.5 w-full items-center justify-center gap-xs rounded-full bg-kakao-yellow text-fm-heading font-bold text-kakao-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <img src={kakaoLogo} alt="" className="w-4.5" />
    카카오로 계속하기
  </button>
);
