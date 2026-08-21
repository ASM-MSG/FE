import "../global.css";
import { View } from "react-native";
import { Stack } from "expo-router";
import { bootstrapAuth, useAuth } from "../features/auth/model/auth-session";
import { useConsentGate } from "../features/auth/model/use-consent-gate";
import { SignupConsentScreen } from "../features/auth/ui/signup-consent-screen";
import { usePushNavigation } from "../features/notifications/api/use-push-navigation";
import { usePushTokenSync } from "../features/notifications/api/use-push-registration";
import { ProcessingNoticeHost } from "../features/upload/ui/processing-notice-host";
import { QueryProvider } from "../shared/api/query-provider";
import { goToRoute } from "../shared/navigation";

// API 부트스트랩 (MSG-419) — 에러 정규화 인터셉터 등록 + 인증 파이프라인 배선 +
// 보안 저장소 재수화. 모듈 로드 시 1회 (웹 main.tsx 대응, 내부에 재진입 가드).
// 온디바이스 스토리북(EXPO_PUBLIC_STORYBOOK=1)은 UI 전용이라 인터셉터 등록·파이프라인
// 배선·보안 저장소(Keychain) 읽기가 전부 불필요하므로 건너뛴다 (index.tsx의 isStorybook
// 판정과 동일 조건). 주의 — 이 가드는 **호출만** 막고 import 체인은 막지 못한다.
// env 없이 Storybook을 띄우는 조건은 client-config.ts의 Storybook 분기가 책임진다
// (재작업 1회차: 이 가드만으로 env를 면제한다고 본 것이 결함이었다).
if (process.env.EXPO_PUBLIC_STORYBOOK !== "1") {
  bootstrapAuth();
}

/**
 * 회원가입 약관 동의 게이트 (MSG-422) — 로그인 + `locationConsent=false`면 앱 화면 대신
 * 전면 동의 화면을 렌더한다. 라우트를 새로 만들지 않고 `Stack` 자체를 대체하므로
 * 딥링크·`router.push`·탭 이동 어느 경로로도 우회되지 않는다 (AC 5, 웹 AppLayout 미러).
 * 로딩 중·조회 실패에는 게이트가 뜨지 않아 앱이 통째로 잠기지 않는다 (AC 2).
 * QueryProvider 하위여야 게이트 훅이 useQuery를 쓸 수 있어 별도 컴포넌트로 뺐다.
 */
const AppShell = () => {
  const showConsentGate = useConsentGate();
  const { isAuthenticated } = useAuth();

  /**
   * 푸시 배선 (MSG-429 기준 14·16) — 게이트 **바깥**에 둔다. 알림 탭은 동의 게이트가
   * 떠 있는 동안에도 도착하고, 토큰 자동 동기화는 화면 상태와 무관한 상주 작업이다.
   * 신규 등록 경로가 아니라 기존 등록자의 재등록·로테이션뿐이라 권한 프롬프트는 뜨지 않는다.
   */
  usePushTokenSync(isAuthenticated);
  usePushNavigation(goToRoute);

  /**
   * 게이트가 뜨면 통지 호스트는 **의도적으로 마운트하지 않는다** (PR #78 리뷰 ④ — 기각).
   * MSG-422의 계약은 "동의 전에는 어떤 앱 화면에도 도달할 수 없다"이고, 통지 토스트의
   * [확인하기]는 곧 `/upload/blur`로 가는 진입점이라 게이트 위에 띄우면 그 계약이 흔들린다.
   * 폴링이 멈추는 대가는 감수한다 — 대기 항목은 저장소에 남아 게이트 통과 후 `hydrate`로
   * 이어지고, 15분 만료 판정도 저장된 기산점으로 계속 성립한다.
   * (푸시 배선은 위에서 게이트 밖에 둔다 — 알림 탭이 라우팅해도 `AppShell`이 `Stack` 자체를
   * 대체하므로 게이트는 그대로 렌더된다. 우회가 아니다.)
   */
  if (showConsentGate) return <SignupConsentScreen />;
  return (
    /*
      통지 호스트가 절대 배치로 얹히려면 화면을 채우는 부모가 필요하다(fragment로는 기준점이 없다).
      className이 아니라 인라인 style을 쓰는 이유: 이 View는 화면 전체가 걸린 **루트 컨테이너**라
      높이가 0이 되면 Stack이 통째로 안 보인다. NativeWind 스타일시트 적용 여부에 앱 기동을
      걸지 않으려고 RN 기본 스타일로 고정한다(기능 차이는 없다).
    */
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {/* 블러 완료 인앱 통지 (기준 11) — 루트 상주라 어느 화면에 있든 보인다 */}
      <ProcessingNoticeHost />
    </View>
  );
};

export default function RootLayout() {
  return (
    <QueryProvider>
      <AppShell />
    </QueryProvider>
  );
}
