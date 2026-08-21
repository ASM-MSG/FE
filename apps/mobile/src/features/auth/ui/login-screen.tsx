import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Toast } from "@fillmap/ui-native";
import { useKakaoLogin } from "../api/use-kakao-login";
import {
  kakaoLoginNotice,
  resolveKakaoLoginReason,
} from "../model/kakao-login-failure";
import appIcon from "../assets/fillmap-app-icon.png";
import { KakaoLoginButton } from "./kakao-login-button";

/**
 * SOURCE: Figma "소셜 로그인" (node 14094:4867, 390×844) — 모바일 로그인 화면 본체.
 * 구성: 타이틀·서브카피 → halo 원형 위 앱 아이콘·태그라인(flex-1 중앙) → SNS 안내
 * → 카카오 버튼 → 약관 플레인 텍스트(링크·탭 동작 없음 — 제외 범위).
 * 웹 LoginContent(MSG-46)의 카피·토큰 매핑을 승계한다 — 타이틀은 Figma 26px 대신
 * text-fm-display(20px) 다운스케일 확정. Figma 상단 126px은 상태바 포함 수치라
 * SafeAreaView + pt-section(64px 토큰)으로 처리하고 픽셀 고정하지 않는다.
 *
 * MSG-444에서 실연동이 붙었다. 실패 안내 토스트는 Figma에 없는 요소지만 기획의
 * "사유를 알리고 재시도할 수 있다"를 이행하는 것이라 디자인 누락이 아니다(스펙 Figma 오탐 방지).
 * 사용자 취소는 안내하지 않는다 — `kakaoLoginNotice`가 null을 돌려주므로 토스트가 뜨지 않고
 * 화면도 그대로 남는다 (기준 13).
 *
 * 로그인 성공 후 이동은 `/home` 하나다. 미동의 계정 분기는 여기서 하지 않는다 —
 * 루트 `AppShell`의 동의 게이트가 `isAuthenticated` 전이를 보고 스스로 뜬다 (MSG-422).
 */
export const LoginScreen = () => {
  const router = useRouter();
  const kakaoLogin = useKakaoLogin({
    onLoggedIn: () => router.replace("/home"),
  });
  const notice = kakaoLogin.isError
    ? kakaoLoginNotice(resolveKakaoLoginReason(kakaoLogin.error))
    : null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center gap-md px-lg pb-xl pt-section">
        <View className="items-center gap-xs">
          <Text
            accessibilityRole="header"
            className="text-center text-fm-display text-foreground"
          >
            필맵에 로그인
          </Text>
          <Text className="text-center text-fm-base text-foreground-body">
            빠르고 간편하게 시작하세요
          </Text>
        </View>
        <View className="flex-1 items-center justify-center gap-lg">
          <View className="size-52.5 items-center justify-center rounded-full bg-surface">
            <Image source={appIcon} alt="필맵 로고" className="size-26" />
          </View>
          <Text className="text-fm-base text-foreground-body">
            기록하고, 모으고, 탐험하는 지도
          </Text>
        </View>
        {notice !== null && <Toast title={notice} />}
        <Text className="text-fm-label text-foreground-muted">
          SNS 계정으로 간편하게 시작해요
        </Text>
        <KakaoLoginButton
          onPress={() => kakaoLogin.mutate()}
          pending={kakaoLogin.isPending}
        />
        {/* 약관·처리방침 링크 연결은 해당 페이지 티켓에서 (웹 MSG-46 AC 7과 동일한 제외 범위) */}
        <Text className="text-center text-fm-caption text-foreground-body">
          로그인 시 서비스 약관과 개인정보 처리 방침에 동의합니다
        </Text>
      </View>
    </SafeAreaView>
  );
};
