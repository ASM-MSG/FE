import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteVideoMutationOptions,
  guardMutate,
  reportVideoMutationOptions,
  setVideoVisibilityMutationOptions,
  VIDEO_MUTATION_KEYS,
} from "./video-mutations";

/**
 * 영상 액션 mutation 훅 3종 — 옵션 팩토리(`video-mutations`)에 QueryClient를 물리는
 * 얇은 층이다 (MSG-426이 확립한 "옵션 팩토리 + 얇은 훅" 2파일 구조).
 * 콜백은 **훅 레벨 옵션**으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시
 * 유실된다(웹 MSG-325 선례). 삭제·전환은 성공 직후 시트/다이얼로그가 사라지므로 특히 그렇다.
 *
 * **셋 다 같은 방식으로 `mutate`에 in-flight 가드(`guardMutate`)를 씌우고 `mutateAsync`를
 * 감춘다** (MSG-431 codex 리뷰 1·2 — 전환만 가드된 비대칭은 설계가 아니라 누락이었다).
 * `mutateAsync`를 남기면 가드를 우회하는 무가드 발사 경로가 된다(웹 PR #62 리뷰 2).
 * 3줄 중복을 헬퍼로 묶지 않는 것은 의도다 — mutate 입력 타입이 셋 다 달라 제네릭 래퍼가
 * 타입을 넓히기만 하고, 여기서 읽어야 할 것은 "어떤 키로 가드되는가"뿐이다.
 */

/** 공개 범위 전환 [L7·L8] */
export const useSetVideoVisibility = (callbacks?: { onError?: () => void }) => {
  const queryClient = useQueryClient();
  const mutation = useMutation(
    setVideoVisibilityMutationOptions({
      queryClient,
      onError: callbacks?.onError,
    }),
  );

  const { mutateAsync, ...guarded } = mutation;
  void mutateAsync;
  return {
    ...guarded,
    mutate: guardMutate(
      queryClient,
      VIDEO_MUTATION_KEYS.setVisibility,
      mutation.mutate,
    ),
  };
};

/** 영상 삭제 [L6] — 연타 시 중복 DELETE 금지 (codex 리뷰 1) */
export const useDeleteVideo = (callbacks?: {
  onDeleted?: () => void;
  onError?: () => void;
}) => {
  const queryClient = useQueryClient();
  const mutation = useMutation(
    deleteVideoMutationOptions({
      queryClient,
      onDeleted: callbacks?.onDeleted,
      onError: callbacks?.onError,
    }),
  );

  const { mutateAsync, ...guarded } = mutation;
  void mutateAsync;
  return {
    ...guarded,
    mutate: guardMutate(
      queryClient,
      VIDEO_MUTATION_KEYS.deleteVideo,
      mutation.mutate,
    ),
  };
};

/**
 * 영상 신고 [L11] — 성공해도 화면 데이터가 변하지 않아 무효화 대상이 없다(JSDoc 참조).
 * 연타 시 중복 POST 금지 (codex 리뷰 2) — 둘째 요청이 409를 받아 "신고가 접수되었어요"
 * 뒤에 "이미 신고한 영상이에요"가 뒤따르는 모순된 화면이 난다.
 */
export const useReportVideo = (callbacks?: {
  onReported?: () => void;
  onFailed?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  // 신고 성공은 조회 데이터를 바꾸지 않아 무효화 대상이 없다 (규칙 오탐 — 위 JSDoc)
  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation
  const mutation = useMutation(reportVideoMutationOptions(callbacks ?? {}));

  const { mutateAsync, ...guarded } = mutation;
  void mutateAsync;
  return {
    ...guarded,
    mutate: guardMutate(
      queryClient,
      VIDEO_MUTATION_KEYS.report,
      mutation.mutate,
    ),
  };
};
