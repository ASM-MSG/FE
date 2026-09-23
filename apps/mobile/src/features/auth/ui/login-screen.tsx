import { Image, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Toast } from "@fillmap/ui-native";
import { useAppleLogin } from "../api/use-apple-login";
import { useKakaoLogin } from "../api/use-kakao-login";
import {
  resolveSocialLoginReason,
  socialLoginNotice,
  type SocialProvider,
} from "../model/social-login-failure";
import appIcon from "../assets/app-icon.png";
import { AppleLoginButton } from "./apple-login-button";
import { KakaoLoginButton } from "./kakao-login-button";
import { LoginHero } from "./login-hero";

/**
 * SOURCE: Figma "소셜 로그인 · A-1 찍는 순간 점령" (node 16026:466, 390×844) — 모바일 로그인 화면 본체 (MSG-601).
 * 구성: 로고 락업(앱 아이콘 32 + "필맵") → 히어로 스테이지(`LoginHero`) → 헤드라인·서브 → (여백) →
 * 소셜 버튼 스택 → 약관 플레인 텍스트(링크·탭 동작 없음 — 제외 범위).
 * 루트는 ScrollView — Figma 844 기준 배치가 iOS 17 시리즈 + 애플 버튼(+74)에서는 안 들어간다. 세로
 * 여백은 `flex-1` 스페이서가 흡수하고 그래도 모자라면 스크롤(A11 — 락업→스테이지→헤드라인 56px는
 * `gap-xxl` 48 + 흡수, 오탐 방지 4).
 * iOS는 세로를 압축한다(`ios:` 수정자 3개) — 버튼이 둘이라 A-1 간격 그대로면 iPhone 17 Pro(874pt)에서
 * 카카오가 잘리고 애플이 접힌다(검증 실측 993pt). iOS 변형 시안 16015:540이 같은 이유로 스테이지↔헤드라인을
 * 2px까지 붙이고 버튼 간 12·약관 12로 둔 것을 따라 `gap-sm`(12)·`pt-xs`·`pb-md`로 내려 첫 화면에
 * 두 버튼이 온전히 보이게 한다(심사 4.8). Android는 검증 통과 배치 그대로.
 *
 * 애플 버튼은 iOS 빌드에만 렌더된다(앱스토어 심사 4.8) — Android는 카카오만(S1). 두 훅 중 어느 쪽이든
 * 진행 중이면 두 버튼 모두 잠근다(S8·A6 — 카카오 진행 중 애플 시트가 겹치는 것을 막는다). 새 시도 직전에
 * 다른 쪽 mutation을 `reset()`해 마지막 실패만 토스트로 남긴다.
 *
 * 실패 안내 토스트는 Figma에 없는 요소지만 기획의 "사유를 알리고 재시도할 수 있다"를 이행하는 것이라
 * 디자인 누락이 아니다(MSG-444). 사용자 취소는 안내하지 않는다 — `socialLoginNotice`가 null.
 *
 * 로그인 성공 후 이동은 `/home` 하나다. 미동의 계정 분기는 여기서 하지 않는다 —
 * 루트 `AppShell`의 동의 게이트가 `isAuthenticated` 전이를 보고 스스로 뜬다 (MSG-422).
 */
export const LoginScreen = () => {
  const router = useRouter();
  const onLoggedIn = () => router.replace("/home");
  const kakaoLogin = useKakaoLogin({ onLoggedIn });
  const appleLogin = useAppleLogin({ onLoggedIn });
  const pending = kakaoLogin.isPending || appleLogin.isPending;

  const failed: { error: unknown; provider: SocialProvider } | null =
    kakaoLogin.isError
      ? { error: kakaoLogin.error, provider: "kakao" }
      : appleLogin.isError
        ? { error: appleLogin.error, provider: "apple" }
        : null;
  const notice =
    failed === null
      ? null
      : socialLoginNotice(
          resolveSocialLoginReason(failed.error),
          failed.provider,
        );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-xxl px-lg pb-xl pt-7.5 ios:gap-sm ios:pb-md ios:pt-xs"
      >
        <View
          accessible
          accessibilityLabel="필맵"
          className="flex-row items-center gap-xs"
        >
          <Image source={appIcon} className="size-8 rounded-sm" />
          <Text className="text-fm-title-lg text-foreground">필맵</Text>
        </View>
        <LoginHero />
        <View className="gap-xs">
          <Text
            accessibilityRole="header"
            className="text-fm-display-lg text-foreground"
          >
            {"찍는 순간,\n그 칸은 내 거예요"}
          </Text>
          <Text className="text-fm-base text-foreground-muted">
            영상 하나로 100m 격자를 점령해요
          </Text>
        </View>
        <View className="flex-1" />
        {/* 토스트 → 카카오 → (iOS) 애플 → 약관, 간격 12 (버튼 간격 A5·약관 Figma 실측 12) */}
        <View className="gap-sm">
          {notice !== null && <Toast title={notice} />}
          <KakaoLoginButton
            onPress={() => {
              appleLogin.reset();
              kakaoLogin.mutate();
            }}
            pending={pending}
          />
          {Platform.OS === "ios" && (
            <AppleLoginButton
              onPress={() => {
                kakaoLogin.reset();
                appleLogin.mutate();
              }}
              pending={pending}
            />
          )}
          {/* 약관·처리방침 링크 연결은 해당 페이지 티켓에서 (웹 MSG-46 AC 7과 동일한 제외 범위) */}
          <Text className="text-center text-fm-caption text-foreground-muted">
            로그인 시 서비스 약관과 개인정보 처리 방침에 동의합니다
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
