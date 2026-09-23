import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

/**
 * SOURCE: Figma 애플 로고 (node 16015:612 하위) — export `apple-logo.svg`의 path d·fill을 인라인
 * (d 소수점은 2자리 반올림 — kakao-login-button 관례, 18px 렌더에서 차이 없음).
 * fill="white"는 자산 원본 값(= Apple HIG 검정 버튼 위 흰 로고 규정색).
 */
const AppleLogo = () => (
  <Svg width="100%" height="100%" viewBox="0 0 18 18" fill="none">
    <Path
      d="M9.11 5.17C8.4 5.17 7.3 4.36 6.14 4.39C4.61 4.41 3.21 5.28 2.42 6.65C0.84 9.41 2.01 13.48 3.56 15.72C4.32 16.81 5.22 18.04 6.41 18C7.55 17.95 7.97 17.26 9.36 17.26C10.73 17.26 11.12 18 12.33 17.97C13.56 17.95 14.33 16.86 15.08 15.76C15.95 14.49 16.31 13.27 16.33 13.2C16.3 13.19 13.94 12.28 13.92 9.56C13.9 7.28 15.78 6.18 15.86 6.14C14.79 4.57 13.15 4.39 12.57 4.35C11.07 4.24 9.82 5.17 9.11 5.17ZM11.65 2.87C12.28 2.11 12.7 1.05 12.58 0C11.68 0.04 10.58 0.6 9.93 1.36C9.35 2.04 8.84 3.12 8.98 4.15C9.98 4.23 11.01 3.63 11.65 2.87"
      fill="white"
    />
  </Svg>
);

interface AppleLoginButtonProps {
  onPress: () => void;
  /** 인증 진행 중(어느 provider든) — 중복 탭을 막는다 (S8) */
  pending?: boolean;
}

/**
 * SOURCE: Figma "Apple 버튼" (node 16015:612) — 애플 소셜 로그인 버튼 (전폭 62px 검정 pill, iOS 전용).
 * Apple HIG "Sign in with Apple" 규정(검정 컨테이너 + 흰 로고·라벨) 고정색이라 ui-native Button
 * variant로 승격하지 않는다(kakao-login-button과 같은 판단). 프레젠테이셔널 — 로그인 수행은
 * 호출부(login-screen)가 훅으로 담당한다. 진행 중에도 라벨을 바꾸지 않는다(62px 고정 pill).
 * 접근성 이름은 accessibilityLabel로 고정하고 로고는 버튼 그룹핑 안 장식으로 남긴다.
 */
export const AppleLoginButton = ({
  onPress,
  pending = false,
}: AppleLoginButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Apple로 계속하기"
    accessibilityState={{ disabled: pending, busy: pending }}
    disabled={pending}
    onPress={onPress}
    className="h-15.5 w-full flex-row items-center justify-center gap-xs rounded-full bg-apple-black"
  >
    <View className="h-4.5 w-4.5">
      <AppleLogo />
    </View>
    <Text className="text-fm-heading font-bold text-primary-foreground">
      Apple로 계속하기
    </Text>
  </Pressable>
);
