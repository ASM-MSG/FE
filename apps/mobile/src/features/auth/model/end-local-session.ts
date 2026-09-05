import type { QueryClient } from "@tanstack/react-query";
import { aiRouteStore } from "../../ai-route/model/ai-route-store";

/**
 * 로컬 세션 종료의 공통 꼬리 — 로그아웃(`useLogout`)·계정 삭제(`deleteAccountMutationOptions`)가
 * 공유한다. 세션 만료(`onSessionExpired`)는 **타지 않는다** — 그 경로는 같은 사용자의 재로그인이
 * 전제라 AI 경로 입력 문장을 유지한다(MSG-556 §1-4 401 행).
 *
 * `clearSession`(= `authStore.logout`)은 상태 전이(토큰 null)를 **동기로** 끝내고 보안 저장소
 * 정리만 await한다 — 그 await를 먼저 기다리면 비로그인으로 전환된 뒤 캐시가 비워지기 전까지
 * 이전 사용자 데이터가 렌더되는 창이 생긴다(codex 리뷰 Medium). 같은 tick에서 쿼리 캐시와
 * 세션 스코프 모듈 스토어(AI 경로 — 문장·결과·선택 + 14503 기능 꺼짐 플래그, MSG-556 codex
 * P1·재리뷰 P2)를 비워 창을 없애되,
 * await는 호출자가 이어받아 저장소 정리 실패가 미처리 거부로 새지 않게 한다.
 * `authStore`를 직접 import하지 않는 것은 auth-session이 expo-secure-store·expo-router를
 * 끌고 와 순수 vitest에서 로드할 수 없기 때문이다(delete-account-mutation과 같은 주입).
 */
export const endLocalSession = (
  clearSession: () => Promise<void>,
  queryClient: QueryClient,
): Promise<void> => {
  const cleared = clearSession();
  queryClient.clear();
  aiRouteStore.resetForSessionEnd();
  return cleared;
};
