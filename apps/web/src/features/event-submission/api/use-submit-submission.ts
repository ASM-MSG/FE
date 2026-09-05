import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션·키는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  getMySubmissionsQueryKey,
  submitMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  EventSubmissionCreateRequestDto,
  EventSubmissionSubmitResponseDto,
} from "@/shared/api/generated/types.gen";

// 생성 팩토리는 mutationFn을 항상 채운다 — 타입만 optional이라 !로 좁힌다 (기존 관례)
const submitFn = submitMutation().mutationFn!;

/**
 * 행사 등록 신청 제출 (MSG-548 AC 7·9) — `POST /api/org/event-submissions`.
 *
 * **신규 작성(create) 전용**이다 — 반려 재신청(PATCH `resubmit`)은 MSG-550이 별도 훅으로
 * 얹는다(같은 이름에 mode 분기를 넣으면 두 계약의 실패 코드·무효화 범위가 섞인다).
 *
 * 성공 시 내 신청 목록 쿼리(`getMySubmissions`)를 무효화한다 — 목록 화면과 홈 대시보드가
 * 이 쿼리 하나를 공유하므로(MSG-545) 새 신청이 두 화면에 함께 반영된다.
 * 실패는 캐시를 건드리지 않고 그대로 올려 보낸다(모달 유지·재시도 — 안내 문구는
 * `submitFailureNotice`가 소유). navigate·스토어 리셋은 뷰 레이어 몫이다(플랫폼 격리) —
 * 콜백은 훅 레벨로 받는다(mutate per-call 콜백은 관찰자 언마운트 시 유실 — MSG-325 선례).
 */
export const useSubmitSubmission = (callbacks?: {
  onSubmitted?: (receipt: EventSubmissionSubmitResponseDto) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    // 생성 mutationFn은 (variables, context) 2인자 — context를 그대로 위임 전달한다
    mutationFn: async (body: EventSubmissionCreateRequestDto, context) =>
      unwrapEnvelope(await submitFn({ body }, context)),
    onSuccess: (receipt) => {
      void queryClient.invalidateQueries({
        queryKey: getMySubmissionsQueryKey(),
      });
      callbacks?.onSubmitted?.(receipt);
    },
  });
};
