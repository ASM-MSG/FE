import type {
  MutationKey,
  QueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import {
  deleteMutation,
  reportMutation,
  setVisibilityMutation,
} from "../../../shared/api/query-options";
import { toServerReportReason, type ReportReasonId } from "../model/report";
import type { VideoVisibility } from "../model/video-menu";
import {
  invalidateAfterVideoDelete,
  seedPlaybackVisibility,
  type DeletedVideoRef,
} from "./invalidate-video-queries";

/**
 * 영상 액션 mutation 옵션 3종 (MSG-431 L6~L8·L11) — 웹 `use-video-mutations`의 모바일판.
 *
 * 훅이 아니라 **옵션 팩토리**로 두는 것은 MSG-426이 확립한 모바일 관례다: RN 렌더 테스트
 * 인프라가 없어(vitest.config 정책) 테스트가 이 객체를 `MutationObserver`로 직접 구동한다.
 * 얇은 훅은 `use-video-mutations.ts`가 소유한다.
 */

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const deleteFn = deleteMutation().mutationFn!;
const setVisibilityFn = setVisibilityMutation().mutationFn!;
const reportFn = reportMutation().mutationFn!;

export interface SetVideoVisibilityInput {
  videoId: number;
  visibility: VideoVisibility;
}

/**
 * in-flight 판정용 키 — 연타 가드(`guardMutate`)가 이 키로 진행 중 mutation을 센다.
 * 3종 전부가 키를 갖는다: 셋 다 서버 상태를 바꾸는 비멱등 요청이라 중복 발사의 피해가
 * 같은 종류다(중복 DELETE·중복 신고 접수·순서 역전) — 하나만 가드하면 비대칭이다.
 */
export const VIDEO_MUTATION_KEYS = {
  setVisibility: ["video-actions", "set-visibility"],
  deleteVideo: ["video-actions", "delete"],
  report: ["video-actions", "report"],
} as const satisfies Record<string, MutationKey>;

/**
 * 공개 범위 전환 [L7] — `PATCH /api/videos/{videoId}/visibility`.
 * 성공 시 응답 visibility로 playback 캐시를 seed한다(무효화 아님 — seedPlaybackVisibility
 * JSDoc 참조). 전환은 **비낙관**이다(승인 Q6): ✓는 애초에 움직이지 않으므로 실패 시
 * "되돌린다"는 요구가 자동으로 충족되고, 알림은 실패 토스트가 맡는다.
 * 같은 값 재선택 미발사 판정은 호출부(`shouldPatchVisibility`) 몫이다.
 */
export const setVideoVisibilityMutationOptions = ({
  queryClient,
  onError,
}: {
  queryClient: QueryClient;
  onError?: () => void;
}): UseMutationOptions<
  Awaited<ReturnType<typeof setVisibilityFn>>,
  Error,
  SetVideoVisibilityInput
> => ({
  mutationKey: VIDEO_MUTATION_KEYS.setVisibility,
  mutationFn: (input, context) =>
    setVisibilityFn(
      {
        path: { videoId: input.videoId },
        body: { visibility: input.visibility },
      },
      context,
    ),
  onSuccess: (envelope, { videoId }) => {
    // 서버가 되돌려준 값이 정본이다 — 요청 값이 아니라 응답 값을 심는다
    seedPlaybackVisibility(queryClient, videoId, envelope.data.visibility);
  },
  onError: () => onError?.(),
});

/**
 * 발사에 in-flight 가드를 씌운다 [L8] — 같은 키의 요청이 진행 중이면 무시한다(선착 우선).
 * 액션 3종이 **모두 이것 하나**를 쓴다(MSG-431 codex 리뷰 1·2 — 전환만 가드된 비대칭 해소).
 *
 * - 전환: 시트를 다시 열어 PATCH가 겹치면 늦게 도착한 구 요청이 최신 전환을 덮는 순서
 *   역전이 가능하다(웹 codex 리뷰 2와 같은 지점).
 * - 삭제: 연타하면 DELETE가 두 번 나가고, 첫 요청 성공으로 다이얼로그가 닫힌 뒤 뒤늦은
 *   중복이 실패해 다음 열람에 남는 실패 문구를 만든다.
 * - 신고: 중복 요청이 경합하면 "신고 접수" 토스트 뒤에 "이미 신고한 영상" 안내가 뒤따르는
 *   모순된 화면이 난다(둘째 요청이 서버에서 409를 받는다).
 *
 * 창은 1 RTT뿐이고 성공 처리가 화면을 재동기화하므로 무시가 가장 단순한 결정적 동작이다.
 * `isPending`(React 상태)이 아니라 mutation 캐시를 보는 이유는 같은 tick의 재탭을 막기
 * 위함이다 — 상태 반영 전에 두 번째 탭이 들어오면 `isPending`은 아직 false다
 * (MSG-426 알림 토글 선례).
 */
export const guardMutate =
  <TInput>(
    queryClient: QueryClient,
    mutationKey: MutationKey,
    mutate: (input: TInput) => void,
  ): ((input: TInput) => void) =>
  (input) => {
    if (queryClient.isMutating({ mutationKey }) > 0) return;
    mutate(input);
  };

/**
 * 영상 삭제 [L6] — `DELETE /api/videos/{videoId}`.
 * 성공 시 도감·격자 계열을 무효화하고(서버가 정본 — 화면 로컬 감춤을 쓰지 않는다)
 * 완료 콜백을 부른다. 실패 시 아무것도 무효화하지 않아 다이얼로그가 열린 채 재시도할 수 있다.
 */
export const deleteVideoMutationOptions = ({
  queryClient,
  onDeleted,
  onError,
}: {
  queryClient: QueryClient;
  onDeleted?: () => void;
  onError?: () => void;
}): UseMutationOptions<
  Awaited<ReturnType<typeof deleteFn>>,
  Error,
  DeletedVideoRef
> => ({
  mutationKey: VIDEO_MUTATION_KEYS.deleteVideo,
  mutationFn: (input, context) =>
    deleteFn({ path: { videoId: input.videoId } }, context),
  onSuccess: (_data, target) => {
    invalidateAfterVideoDelete(queryClient, target);
    onDeleted?.();
  },
  onError: () => onError?.(),
});

export interface ReportVideoInput {
  videoId: number;
  reasonId: ReportReasonId;
}

/**
 * 영상 신고 [L11] — `POST /api/videos/{videoId}/reports`. FE 사유 id를 서버 enum으로
 * 매핑해 전송한다(detail은 OTHER 전용이라 미전송).
 * 신고는 즉시 블라인드가 아니라(관리자 승인 시 조치) 화면 데이터가 변하지 않는다 —
 * 대응하는 조회 캐시 무효화가 없는 것은 의도다.
 * 중복 신고(11409/409) 분기는 호출부가 `reportFailureNotice`로 판정한다.
 */
export const reportVideoMutationOptions = ({
  onReported,
  onFailed,
}: {
  onReported?: () => void;
  onFailed?: (error: unknown) => void;
}): UseMutationOptions<
  Awaited<ReturnType<typeof reportFn>>,
  Error,
  ReportVideoInput
> => ({
  mutationKey: VIDEO_MUTATION_KEYS.report,
  mutationFn: (input, context) =>
    reportFn(
      {
        path: { videoId: input.videoId },
        body: { reason: toServerReportReason(input.reasonId) },
      },
      context,
    ),
  onSuccess: () => onReported?.(),
  onError: (error) => onFailed?.(error),
});
