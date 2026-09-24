import { View } from "react-native";
import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from "expo-apple-authentication";

interface AppleLoginButtonProps {
  onPress: () => void;
  /** 인증 진행 중(어느 provider든) — 중복 탭을 막는다 (S8) */
  pending?: boolean;
}

/**
 * 애플 소셜 로그인 버튼 (iOS 전용) — **Apple 제공 네이티브 버튼**을 쓴다 (MSG-606 L1).
 * 종전 Figma "Apple 버튼"(16015:612) 커스텀 Pressable은 HIG 허용 범위였지만, 심사 4.8·HIG 지적을
 * 원천 차단하려면 시스템 버튼(`ASAuthorizationAppleIDButton`)이 가장 안전하다. 검정 pill·"Apple로
 * 계속하기"(CONTINUE) 라벨은 시안과 같고 높이(62)·전폭·둥근 모서리도 맞춘다. 로그인 수행은 호출부
 * (login-screen)가 훅으로 담당한다. 진행 중에는 터치를 막고 흐리게 둔다(네이티브 버튼은 disabled prop이 없다).
 */
export const AppleLoginButton = ({
  onPress,
  pending = false,
}: AppleLoginButtonProps) => (
  <View
    accessibilityState={{ disabled: pending, busy: pending }}
    pointerEvents={pending ? "none" : "auto"}
    className={pending ? "opacity-60" : undefined}
  >
    <AppleAuthenticationButton
      buttonType={AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={31}
      style={{ width: "100%", height: 62 }}
      onPress={onPress}
    />
  </View>
);
