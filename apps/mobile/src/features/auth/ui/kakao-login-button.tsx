import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

/**
 * SOURCE: Figma 카카오 로고 (node 13686:1509) — 커밋된 웹 export
 * apps/web/src/features/auth/assets/kakao-logo.svg의 path d·fill을 인라인
 * (d 소수점은 2자리 반올림 — react-doctor svg 정밀도 게이트, 18px 렌더에서 차이 없음).
 * (metro svg transformer 신규 도입 없이 react-native-svg로 렌더 — 단순성 우선.)
 * viewBox 18×16.8: 18px 컨테이너 안 심벌은 상하 inset이 있는 원본 규격이다(결함 아님).
 * fill="black"은 자산 원본 값(= kakao-black, 카카오 브랜드 규정색).
 */
const KakaoLogo = () => (
  <Svg width="100%" height="100%" viewBox="0 0 18 16.8" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 0C4.03 0 0 3.11 0 6.95C0 9.34 1.56 11.45 3.93 12.7L2.93 16.34C2.84 16.67 3.21 16.92 3.5 16.74L7.87 13.85C8.24 13.88 8.62 13.9 9 13.9C13.97 13.9 18 10.79 18 6.95C18 3.11 13.97 0 9 0"
      fill="black"
    />
  </Svg>
);

interface KakaoLoginButtonProps {
  onPress: () => void;
  /** 인증 진행 중 — 중복 탭을 막는다 (기준 15) */
  pending?: boolean;
}

/**
 * SOURCE: Figma "Default Button" (node 14094:4867 하위) — 카카오 소셜 로그인 버튼 (전폭 62px pill).
 * 카카오 브랜드 규정색(컨테이너 kakao-yellow, 라벨·심벌 kakao-black) 고정이라 ui-native Button
 * variant로 승격하지 않는다(웹 MSG-46 확정 승계 — 아이콘 슬롯·62px 규격도 불일치).
 * 프레젠테이셔널 — 로그인 수행은 호출부(login-screen)가 훅으로 담당한다 (MSG-444).
 * 진행 중에도 **라벨을 바꾸지 않는다** — 62px 고정 pill에서 문구가 길어지면 레이아웃이 흔들린다.
 * 접근성 이름은 accessibilityLabel로 고정하고 로고 심벌은 버튼 그룹핑 안 장식으로 남긴다
 * (a11y 트리 비노출).
 */
export const KakaoLoginButton = ({
  onPress,
  pending = false,
}: KakaoLoginButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="카카오로 계속하기"
    accessibilityState={{ disabled: pending, busy: pending }}
    disabled={pending}
    onPress={onPress}
    className="h-15.5 w-full flex-row items-center justify-center gap-xs rounded-full bg-kakao-yellow"
  >
    <View className="h-4.5 w-4.5">
      <KakaoLogo />
    </View>
    <Text className="text-fm-heading font-bold text-kakao-black">
      카카오로 계속하기
    </Text>
  </Pressable>
);
