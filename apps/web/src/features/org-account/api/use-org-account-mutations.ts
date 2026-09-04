import { useMutation, useQueryClient } from "@tanstack/react-query";
// 생성 mutation 옵션·쿼리 키는 barrel(generated/index.ts) 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  getProfileQueryKey,
  requestEmailChangeMutation,
  updateProfileMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 계정 설정 mutation 2종 (MSG-544 AC 4·8·9) — 담당자 정보 저장 · 아이디(공식 이메일)
 * 변경 요청. 비밀번호 변경은 542가 만든 `features/auth/api/use-password-mutations`에
 * 함께 산다(같은 서버 도메인의 4번째 훅).
 *
 * `use-password-mutations`처럼 **생성 mutation 옵션을 그대로 위임**한다 — 응답 헤더가
 * 필요 없어 SDK를 직접 호출할 이유가 없다. 변수는 평면 객체로 받아 화면이 SDK Options
 * 계층을 모르게 한다.
 */
const updateProfileFn = updateProfileMutation().mutationFn!;
const requestEmailChangeFn = requestEmailChangeMutation().mutationFn!;

/**
 * 담당자 정보 저장 (AC 4) — `PATCH /api/org/profile`.
 *
 * 두 필드 모두 required라 **부분 PATCH가 아니다** — 항상 이름·연락처를 같이 보낸다.
 * 응답이 변경 후 프로필 전체이므로 성공 시 조회 캐시를 그 응답으로 직접 갱신한다:
 * 재조회 왕복 없이 폼과 사이드바(`useOrgProfileQuery` 공유 캐시)가 같은 값을 읽는다.
 */
export const useUpdateOrgProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      variables: { contactName: string; contactPhone: string },
      context,
    ) => updateProfileFn({ body: variables }, context),
    onSuccess: (response) =>
      queryClient.setQueryData(getProfileQueryKey(), response),
  });
};

/**
 * 아이디(공식 이메일) 변경 요청 (AC 8·9) — `POST /api/org/email-change-request`.
 *
 * 접수만 하는 API다: 관리자가 승인해야 실제로 바뀌고, 대기 중인 요청이 있으면 새 값으로
 * 갱신된다(마지막 요청이 유효) — 그래서 재요청을 막지 않는다. 응답에 데이터가 없어
 * 훅은 성공·실패 상태만 제공하고, 이메일 조회 캐시는 아직 바뀐 것이 없으므로 건드리지
 * 않는다. org 쪽 **대기 상태 조회 API가 없어** 승인 대기 안내는 화면의 세션 로컬 표시다.
 */
export const useRequestEmailChange = () =>
  useMutation({
    mutationFn: (variables: { requestedEmail: string }, context) =>
      requestEmailChangeFn({ body: variables }, context),
  });
