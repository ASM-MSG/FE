import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../../../shared/api/sdk";
import { fcmTokenStorage } from "../../../shared/fcm-token-storage";
import { authStore } from "../model/auth-session";
import { endLocalSession } from "../model/end-local-session";
import { settleLogoutToken } from "./logout-fcm-token";

/**
 * 로그아웃 (AC 22) — `POST /api/auth/logout`으로 서버 세션까지 무효화한 뒤 로컬 세션을 끊는다.
 * Authorization·`X-Device-Id` 헤더는 인증 파이프라인(configure-auth)이 주입하므로 손으로
 * 넣지 않는다. **fcmToken은 보관돼 있으면 body에 동봉한다** (MSG-429 기준 17) — 서버가
 * 로그아웃과 푸시 토큰 해제를 한 번에 처리하는 계약이고(명세: MSG-178 logout 통합), 안 보내면
 * 로그아웃한 계정의 푸시가 이 기기로 계속 온다. MSG-419의 "모바일 푸시 미구현" 전제는 해소됐다.
 *
 * 정산은 `onSettled` — 성공·실패와 무관하게 로컬 세션을 종료하는 **로컬 우선 종료**다
 * (웹 useLogout 선례. 서버 호출이 실패했다고 사용자를 미동의 로그인 상태에 묶어 두면
 * 게이트에서 빠져나갈 방법이 사라진다). 로컬 토큰이 비면 isAuthenticated가 false가 되어
 * 게이트 조건이 풀리고 비로그인 앱 화면이 렌더된다.
 *
 * 정산 후 후속(라우팅 등)은 **훅 레벨 옵션**으로 받는다 — `mutate(undefined, { onSettled })`
 * 같은 per-call 콜백은 관찰자가 언마운트되면 실행되지 않아, 세션만 끊기고 이동은 누락되는
 * 상태가 남는다(웹 MSG-325 선례. MSG-426 리뷰에서 로그아웃 배선만 이 원칙 밖에 있던 것을 정정).
 * 라우팅 자체는 주입받는다 — RN 경계.
 */
export const useLogout = (callbacks?: { onSettled?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      logout({
        ...(await settleLogoutToken({
          readStoredToken: fcmTokenStorage.read,
          clearStoredToken: fcmTokenStorage.clear,
        })),
        throwOnError: true,
      }),
    onSettled: async () => {
      // 세션 종료 + 같은 tick 캐시·세션 스토어 정리 — 순서·이유는 endLocalSession 주석
      await endLocalSession(authStore.logout, queryClient);
      callbacks?.onSettled?.();
    },
  });
};
