import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { VideoUploadResponseDto } from "../../../shared/api/sdk";
import type { ConfirmUploadInput } from "../model/confirm-input";
import { withFlowProgress } from "../model/flow-progress";
import { runUploadFlow, UploadFlowError } from "../model/upload-orchestration";
import { uploadFlowStore } from "../model/upload-flow-store";
import { invalidateGridQueries } from "./invalidate-grid-queries";
import {
  buildAnalyzeEffects,
  buildConfirmEffects,
  type UploadSource,
} from "./upload-effects";

/**
 * 업로드 뮤테이션 훅 (기준 23·24·28) — 선분석·확정 각각 presign → S3 PUT → 확정
 * 단계열(upload-orchestration)을 구동한다. 무엇이 나가는지의 계약은 upload-effects가
 * 소유하고, 여기는 **진행 상태를 어디에 보관하는가**만 담당한다.
 *
 * 웹은 진행 상태를 훅 안의 useRef에 두지만 모바일은 **스토어에 둔다**(기준 36) — 앱을
 * 백그라운드로 보냈다 돌아오거나 콜드 스타트해도 성공한 단계를 건너뛰고 이어가야 하고,
 * ref는 화면 언마운트와 함께 사라지기 때문이다. 실패 시에도 진행 상태를 보존해
 * 재시도가 성공 단계를 건너뛴다(기준 31·34).
 *
 * **발사는 반드시 `start`/`publish`로 한다 — `mutate`를 직접 부르지 말 것 (기준 35).**
 * `isPending`은 비동기 React 상태라 같은 틱에 도착한 두 번째 탭에는 아직 false다. 실제로
 * 연타가 확정 체인을 두 번 완주시켜 서버에 중복 영상을 만들었다(실측 videoId 287+288).
 * 아래 래퍼는 스토어의 **동기** 잠금(`beginFlight`)을 먼저 잡고, 해제는 뮤테이션 자신의
 * `onSettled`에 둔다 — 화면이 언마운트돼도(그때는 per-call 콜백이 실행되지 않는다)
 * 잠금이 남지 않게 하기 위해서다.
 */

/** 발사 래퍼가 그대로 넘기는 per-call 콜백 묶음 */
type MutateOptions<TData, TVariables> = Parameters<
  UseMutationResult<TData, Error, TVariables>["mutate"]
>[1];

/** 선분석 — 성공 시 highlights 시간쌍 배열. 캐시 무효화 없음이 의도다(서버 비저장 임시값) */
export const useAnalyzeVideo = () => {
  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation
  const mutation = useMutation({
    mutationFn: async (source: UploadSource) => {
      const initial = uploadFlowStore.getState().analysis;
      try {
        const { state, result } = await runUploadFlow(
          initial,
          // 단계가 끝날 때마다 스토어에 남긴다 — 흐름 종료 시점에만 기록하면 도중에 앱이
          // 종료됐을 때 재개가 이미 끝난 단계를 다시 실행한다 (기준 31·34·36)
          withFlowProgress(buildAnalyzeEffects(source), initial, (progress) =>
            uploadFlowStore.setAnalysisFlow(progress),
          ),
        );
        uploadFlowStore.setAnalysisFlow(state);
        return result;
      } catch (error) {
        if (error instanceof UploadFlowError) {
          uploadFlowStore.setAnalysisFlow(error.state);
        }
        throw error;
      }
    },
    // 성공·실패 어느 쪽이든 잠금을 푼다 (뮤테이션 자신의 lifecycle — 항상 실행된다)
    onSettled: () => uploadFlowStore.endFlight(),
  });

  return {
    ...mutation,
    /** 선분석 발사 — 같은 틱의 두 번째 호출은 무시된다 (기준 35) */
    start: (
      source: UploadSource,
      options?: MutateOptions<number[][] | null | undefined, UploadSource>,
    ) => {
      if (!uploadFlowStore.beginFlight("analysis")) return;
      mutation.mutate(source, options);
    },
  };
};

/**
 * 게시 성공 정산 (기준 28·29) — 격자 쿼리 무효화 + **재개 가능한 진행 정리**.
 *
 * 정리가 여기 있는 이유: 완료 오버레이는 화면 로컬 상태라, 그게 떠 있는 동안 앱이 종료되면
 * 스토어에는 `step:"preview"`와 `confirm:{presign, s3PutDone:true}`가 그대로 남는다. 다음
 * 실행이 미리보기로 재개되고 게시가 다시 활성화되는데 오케스트레이션은 PUT까지 끝난 상태라
 * **finalize만 다시 쏴 중복 영상이 생긴다**(codex 리뷰 3회차). 성공 응답을 손에 쥔 이 시점이
 * 그 창을 닫을 수 있는 유일한 지점이다 — 확정 응답을 못 본 채 종료되는 창(서버 멱등 키 필요,
 * flow-progress.ts 주석)과 달리 이건 클라이언트가 닫을 수 있다.
 *
 * 뮤테이션 옵션의 onSuccess에서 부른다(per-call 콜백이 아니라) — 화면이 언마운트돼도 실행돼야
 * 정리가 빠지지 않기 때문이다(endFlight와 같은 이유). 완료 화면 표시는 이 정리와 무관하게
 * 화면 로컬 상태로 유지된다.
 */
export const settleUploadSuccess = (
  queryClient: QueryClient,
  video: { videoId: number; gridId: string },
): void => {
  invalidateGridQueries(queryClient, video.gridId);
  uploadFlowStore.reset();
};

/** 업로드 확정 — 성공 시 격자 쿼리 무효화 + 재개 가능한 진행 정리 (기준 28·29) */
export const useConfirmUpload = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: ConfirmUploadInput) => {
      const initial = uploadFlowStore.getState().confirm;
      try {
        const { state, result } = await runUploadFlow(
          initial,
          withFlowProgress(buildConfirmEffects(input), initial, (progress) =>
            uploadFlowStore.setConfirmFlow(progress),
          ),
        );
        uploadFlowStore.setConfirmFlow(state);
        return result;
      } catch (error) {
        if (error instanceof UploadFlowError) {
          uploadFlowStore.setConfirmFlow(error.state);
        }
        throw error;
      }
    },
    onSuccess: (video) => settleUploadSuccess(queryClient, video),
    onSettled: () => uploadFlowStore.endFlight(),
  });

  return {
    ...mutation,
    /** 확정 발사 — 같은 틱의 두 번째 탭은 무시된다, 중복 게시 차단 (기준 35) */
    publish: (
      input: ConfirmUploadInput,
      options?: MutateOptions<VideoUploadResponseDto, ConfirmUploadInput>,
    ) => {
      if (!uploadFlowStore.beginFlight("confirm")) return;
      mutation.mutate(input, options);
    },
  };
};
