import "../global.css";
import { Stack } from "expo-router";
import { bootstrapAuth } from "../features/auth/model/auth-session";
import { useConsentGate } from "../features/auth/model/use-consent-gate";
import { SignupConsentScreen } from "../features/auth/ui/signup-consent-screen";
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
  if (showConsentGate) return <SignupConsentScreen />;
  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  return (
    <QueryProvider>
      <AppShell />
    </QueryProvider>
  );
}
