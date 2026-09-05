import type { QueryClient, UseMutationOptions } from "@tanstack/react-query";
import { deleteMeMutation } from "../../../shared/api/query-options";
import { endLocalSession } from "../../auth/model/end-local-session";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
// (웹 use-profile-mutations 선례)
const deleteMeFn = deleteMeMutation().mutationFn!;

export interface DeleteAccountDeps {
  queryClient: QueryClient;
  /**
   * 로컬 세션 종료 — `authStore.logout`을 훅이 주입한다. 여기서 직접 import하지 않는
   * 이유는 auth-session이 expo-secure-store·expo-router를 끌고 와 순수 vitest에서
   * 로드할 수 없기 때문이다(RN 경계 규칙의 어댑터 주입과 같은 처리).
   */
  clearSession: () => Promise<void>;
  /** 삭제 후 이동 — 라우팅은 화면이 주입한다 (RN 경계) */
  onDeleted: () => void;
}

/**
 * 계정 삭제 mutation 옵션 (기준 10) — `DELETE /api/users/me`.
 * 성공하면 로컬 세션·쿼리 캐시를 비우고 이동 콜백을 부른다. 실패하면 아무것도 정리하지
 * 않아 모달이 남고 세션도 유지된다(재시도 가능).
 *
 * 캐시 정리는 `queryClient.clear()`다 — `resetSessionCache`(=`resetQueries()`)는 자기
 * 주석이 "로그아웃 경로에는 쓰지 않는다, 재조회가 곧 401"이라 못박고 있고 기존
 * `useLogout`도 clear()를 쓴다 (스펙 E3 결정, 티켓 안내와의 편차는 지라 환류 대상).
 *
 * 훅이 아니라 옵션 팩토리로 두는 이유: RN 렌더 테스트 인프라가 없어 테스트가 이 객체를
 * `MutationObserver`로 직접 구동한다 (vitest.config 정책).
 */
export const deleteAccountMutationOptions = ({
  queryClient,
  clearSession,
  onDeleted,
}: DeleteAccountDeps): UseMutationOptions<
  Awaited<ReturnType<typeof deleteMeFn>>,
  Error,
  void
> => ({
  // 명세가 Authorization을 명시 헤더 파라미터로 선언해 생성 타입이 요구한다 (스펙 R6) —
  // 실값은 auth-pipeline의 beforeRequest가 Bearer 토큰으로 덮어쓴다
  mutationFn: (_variables, context) =>
    deleteMeFn({ headers: { Authorization: "" } }, context),
  onSuccess: async () => {
    // 세션 종료 + 같은 tick 캐시·세션 스토어 정리 — 순서·이유는 endLocalSession 주석
    const cleared = endLocalSession(clearSession, queryClient);
    onDeleted();
    await cleared;
  },
});
