import "../global.css";
import { View } from "react-native";
import { Stack } from "expo-router";
import {
  isRouteGuardOpen,
  PROTECTED_ROUTES,
} from "../features/auth/model/app-entry";
import {
  authStore,
  bootstrapAuth,
  useAuth,
} from "../features/auth/model/auth-session";
import { useConsentGate } from "../features/auth/model/use-consent-gate";
import { SignupConsentScreen } from "../features/auth/ui/signup-consent-screen";
import { usePushForegroundHandler } from "../features/notifications/api/use-push-foreground-handler";
import { usePushTokenSync } from "../features/notifications/api/use-push-registration";
import { configureReadyRefresh } from "../features/upload/api/start-ready-refresh";
import { QueryProvider } from "../shared/api/query-provider";

// API 부트스트랩 (MSG-419) — 에러 정규화 인터셉터 등록 + 인증 파이프라인 배선 +
// 보안 저장소 재수화. 모듈 로드 시 1회 (웹 main.tsx 대응, 내부에 재진입 가드).
// 온디바이스 스토리북(EXPO_PUBLIC_STORYBOOK=1)은 UI 전용이라 인터셉터 등록·파이프라인
// 배선·보안 저장소(Keychain) 읽기가 전부 불필요하므로 건너뛴다 (index.tsx의 isStorybook
// 판정과 동일 조건). 주의 — 이 가드는 **호출만** 막고 import 체인은 막지 못한다.
// env 없이 Storybook을 띄우는 조건은 client-config.ts의 Storybook 분기가 책임진다
// (재작업 1회차: 이 가드만으로 env를 면제한다고 본 것이 결함이었다).
if (process.env.EXPO_PUBLIC_STORYBOOK !== "1") {
  bootstrapAuth();
  // READY 재무효화 폴의 세션 배선 (MSG-567 AC 13) — auth-session을 import할 수 없는
  // use-upload-mutations 대신 여기서 주입한다(vitest 로드 제약, 스펙 A2)
  configureReadyRefresh(authStore);
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
  const { hydrated, isAuthenticated } = useAuth();

  /**
   * 푸시 배선 (MSG-429 기준 14) — 게이트 **바깥**에 둔다. 배너 핸들러 등록과 토큰 자동
   * 동기화는 화면 상태와 무관한 상주 작업이다. 신규 등록 경로가 아니라 기존 등록자의
   * 재등록·로테이션뿐이라 권한 프롬프트는 뜨지 않는다. 알림 탭 라우팅은 MSG-567에서
   * 삭제됐다(FCM 푸시에 `data` 없음) — 탭은 앱 열기로 끝난다.
   */
  usePushTokenSync(isAuthenticated);
  usePushForegroundHandler();

  /**
   * 구 블러 통지 호스트(`ProcessingNoticeHost`)는 MSG-567에서 삭제됐고 대체 마운트는 없다 —
   * READY 재무효화 폴은 모듈 소유 타이머(`start-ready-refresh`)라 마운트가 필요 없다.
   * PR #78 리뷰 ④("게이트 위 호스트 미마운트")의 계약 논점도 함께 소멸했다.
   */
  if (showConsentGate) return <SignupConsentScreen />;
  return (
    /*
      className이 아니라 인라인 style을 쓰는 이유: 이 View는 화면 전체가 걸린 **루트 컨테이너**라
      높이가 0이 되면 Stack이 통째로 안 보인다. NativeWind 스타일시트 적용 여부에 앱 기동을
      걸지 않으려고 RN 기본 스타일로 고정한다(기능 차이는 없다).
    */
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/*
          홈 로그인 게이트 (MSG-561) — 앱은 로그인 필수. guard가 꺼지면 보호 화면이 네비게이터에서
          제거돼 딥링크·푸시 탭·업로드 이어가기 어느 경로로도 우회되지 않고, 보호 화면에 있던
          스택도 통째로 사라져 뒤로가기로 홈에 못 돌아간다. 공개 라우트(index·login·dev)는
          등재하지 않아도 자동 추가된다. 재수화 전에 열어 두는 이유는 `isRouteGuardOpen` JSDoc.
        */}
        <Stack.Protected
          guard={isRouteGuardOpen({ hydrated, isAuthenticated })}
        >
          {PROTECTED_ROUTES.map((name) => (
            <Stack.Screen key={name} name={name} />
          ))}
        </Stack.Protected>
      </Stack>
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
