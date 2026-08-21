import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/model/auth-store";
// useMutation 밖(effect)에서 호출한다 — 생성 mutation 옵션의 mutationFn은
// MutationFunctionContext를 요구하므로 SDK를 직접 호출한다 (use-auth-mutations의
// login/oauthCodeLogin 직접 호출 선례. throwOnError로 비-2xx를 throw로 수렴)
import { register, unregister } from "@/shared/api/generated/sdk.gen";
import { isPushSupported } from "../model/push-support";
import { decideSyncAction, shouldAutoSync } from "../model/push-sync";
import { usePushTokenStore } from "../model/push-token-store";
import {
  fetchFcmToken,
  getPermission,
  readPushCapabilities,
} from "./messaging";

/**
 * 셸 상주 자동 동기화 훅 (MSG-408 AC 1·2·3·13) — **기존 등록자 한정** 재등록·로테이션.
 * 발동 조건 = 로그인 && 지원 && 권한 granted && 보관 토큰 존재(shouldAutoSync). 권한 요청은
 * 하지 않는다 — 신규 등록 진입점은 프로필 토글뿐이다 (스펙 결정 1, AC 2).
 * 셸 분기(위치동의 게이트 통과 후) 내부에만 마운트한다 — PushNoticeHost가 호출 (AC 3).
 * 실패는 콘솔 경고로만 남긴다 — 앱 기동·로그인 흐름을 막지 않는다 (AC 13). UPSERT·DELETE
 * 멱등이라 실패해도 다음 동기화가 자기 수복한다 (스펙 리스크 절).
 */
export const usePushTokenSync = (): void => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refresh = usePushTokenStore((s) => s.refresh);
  const setToken = usePushTokenStore((s) => s.setToken);

  useEffect(() => {
    // 외부 기록자(로그아웃)가 보관만 비웠을 수 있다 — 저장소 실값으로 정렬 후 판정
    refresh();
    const storedToken = usePushTokenStore.getState().token;
    if (
      !shouldAutoSync({
        isAuthenticated,
        supported: isPushSupported(readPushCapabilities()),
        permission: getPermission(),
        storedToken,
      })
    )
      return;
    // 언마운트(로그아웃·계정 전환) 경쟁 가드 (codex 리뷰 2) — 각 비동기 단계 후 중단해,
    // 로그아웃이 비운 보관을 늦은 setToken이 재오염하는 경로를 막는다
    let cancelled = false;
    void (async () => {
      const freshToken = await fetchFcmToken();
      if (cancelled) return;
      const action = decideSyncAction(storedToken, freshToken);
      if (action.type === "none") return;
      if (action.type === "rotate") {
        // 구토큰 해제 먼저 — 멱등(없는 토큰 해제도 200)이라 순서 실패 걱정 없음 (AC 1)
        await unregister({
          query: { fcmToken: action.staleToken },
          throwOnError: true,
        });
        if (cancelled) return;
      }
      await register({
        body: { fcmToken: action.token, platform: "WEB" },
        throwOnError: true,
      });
      if (cancelled) return;
      if (action.type === "rotate") setToken(action.token);
    })().catch((error: unknown) => {
      console.warn("[notifications] 푸시 토큰 자동 동기화 실패", error);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refresh, setToken]);
};
