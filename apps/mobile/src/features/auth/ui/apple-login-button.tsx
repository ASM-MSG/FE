import { Pressable } from "react-native";
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
 * 네이티브 Apple 버튼(`ASAuthorizationAppleIDButton`)은 글자 크기를 버튼 높이에 비례해 스스로 정한다 —
 * 62px로 그리면 라벨이 카카오 버튼(heading 16px)의 1.6배쯤 돼 두 버튼이 한 쌍으로 안 보였다(1.0.0 실측).
 * 그래서 **같은 색(apple-black) 62px pill 안에 네이티브 버튼을 40px로 넣는다**: 눈에는 62px 버튼 하나,
 * 라벨은 카카오와 비슷한 크기. 시스템 버튼 자체는 손대지 않으므로 커스텀 버튼 심사 리스크(HIG 4.8)는 그대로 피한다.
 * 터치는 **바깥 Pressable 하나만** 받는다 — 안쪽 네이티브 버튼은 `pointerEvents: "none"`(시각 전용). 둘 다
 * onPress를 가지면 RN responder가 네이티브 컨트롤 위의 터치도 부모로 올려 인증 시트가 두 번 뜰 수 있다(PR #171 리뷰).
 */
const INNER_HEIGHT = 40;

/**
 * 애플 소셜 로그인 버튼 (iOS 전용) — **Apple 제공 네이티브 버튼**을 쓴다 (MSG-606 L1).
 * 종전 Figma "Apple 버튼"(16015:612) 커스텀 Pressable은 HIG 허용 범위였지만, 심사 4.8·HIG 지적을
 * 원천 차단하려면 시스템 버튼(`ASAuthorizationAppleIDButton`)이 가장 안전하다. 검정 pill·"Apple로
 * 계속하기"(CONTINUE) 라벨은 시안과 같고 높이(62)·전폭·둥근 모서리도 맞춘다. 로그인 수행은 호출부
 * (login-screen)가 훅으로 담당한다. 진행 중에는 `disabled`로 터치를 막고 흐리게 둔다.
 * 접근성: 바깥 Pressable은 `accessible={false}`라 VoiceOver는 안쪽 시스템 버튼 하나만 읽는다.
 */
export const AppleLoginButton = ({
  onPress,
  pending = false,
}: AppleLoginButtonProps) => (
  <Pressable
    accessible={false}
    disabled={pending}
    onPress={onPress}
    className={`h-15.5 w-full justify-center rounded-full bg-apple-black${pending ? " opacity-60" : ""}`}
  >
    <AppleAuthenticationButton
      buttonType={AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={INNER_HEIGHT / 2}
      style={{ width: "100%", height: INNER_HEIGHT, pointerEvents: "none" }}
      // 네이티브 뷰라 onPress prop이 필수 — 터치는 위 pointerEvents로 막혀 호출되지 않는다
      onPress={onPress}
    />
  </Pressable>
);
