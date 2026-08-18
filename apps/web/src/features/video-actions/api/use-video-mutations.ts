import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
// 삭제된 영상이 열려 있으면 패널을 닫는 연동 — 플랫폼 중립 스토어 import (map-home 수정 없음)
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { invalidateGridQueries } from "@/features/upload/api/invalidate-grid-queries";
// 생성 mutation 옵션·키는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  deleteMutation,
  getCollectionGridsQueryKey,
  getGridGlobalVideosQueryKey,
  getPlaybackQueryKey,
  getRegionVideosQueryKey,
  getStatByPointQueryKey,
  getSummaryQueryKey,
  reportMutation,
  setVisibilityMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { type ReportReasonId, toServerReportReason } from "../model/report";
import type { VideoVisibility } from "../model/video-menu";

/**
 * 영상 액션 mutation 훅 3종 (MSG-411 AC 2·4·5·6) — use-profile-mutations 패턴 미러
 * (생성 SDK mutation 옵션 기반, 직접 fetch/URL 하드코딩 없음).
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다(MSG-325 선례).
 */

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const deleteFn = deleteMutation().mutationFn!;
const setVisibilityFn = setVisibilityMutation().mutationFn!;
const reportFn = reportMutation().mutationFn!;

export interface DeleteVideoInput {
  videoId: number;
  /** 격자 쿼리 무효화 대상 — 미확보(playback 해소 전 확정 등)면 null: 격자 계열 광역 무효화 */
  gridId: string | null;
}

/**
 * 파라미터로 캐시 키가 갈라지는 쿼리의 전 파라미터 무효화 — 생성 키의 식별자(`_id`)만
 * 남긴 부분 키(TanStack 부분 일치) (invalidate-grid-queries의 점령 격자 관례).
 */
const invalidateAllOf = (
  queryClient: QueryClient,
  [key]: [{ _id: string }],
): void => {
  void queryClient.invalidateQueries({ queryKey: [{ _id: key._id }] });
};

/**
 * 영상 삭제 (AC 4) — `DELETE /api/videos/{videoId}`.
 * 성공 시 도감 쿼리(수집 요약·수집 격자·동 영상 목록·수집률 by-point — 삭제로 수치가
 * 전부 변한다)와 격자 쿼리 세트(invalidateGridQueries — 점령·격자 상세·영상 2종·통계,
 * "격자의 내 영상이 모두 사라지면 점령 롤백" 명세 대응)를 무효화한다.
 * 삭제된 영상의 playback 캐시는 제거(remove)한다 — 무효화면 재조회가 404로 끝난다.
 * 그 영상이 미니 패널에 열려 있으면 패널 선택도 닫는다 — 진입점(도감 카드·미니 패널)
 * 어느 쪽이든 삭제된 영상이 화면에 잔존하지 않는다 (codex 리뷰 3).
 * 실패 시 아무것도 무효화하지 않고 onError만 부른다 (AC 5).
 */
export const useDeleteVideo = (callbacks?: {
  onDeleted?: () => void;
  onError?: () => void;
}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteVideoInput, context) =>
      deleteFn({ path: { videoId: input.videoId } }, context),
    onSuccess: (_data, { videoId, gridId }) => {
      // 삭제된 영상 잔존 방지 (codex 리뷰 3) — 열려 있는 미니 패널 닫기 + 죽은 캐시 제거
      const miniPanel = useVideoMiniPanelStore.getState();
      if (miniPanel.selected?.video.videoId === videoId) miniPanel.close();
      queryClient.removeQueries({
        queryKey: getPlaybackQueryKey({ path: { videoId } }),
      });

      void queryClient.invalidateQueries({ queryKey: getSummaryQueryKey() });
      void queryClient.invalidateQueries({
        queryKey: getCollectionGridsQueryKey(),
      });
      invalidateAllOf(
        queryClient,
        getRegionVideosQueryKey({ query: { regionCode: "" } }),
      );
      invalidateAllOf(
        queryClient,
        getStatByPointQueryKey({ query: { lat: 0, lng: 0 } }),
      );
      // gridId 미상(null)이면 invalidateGridQueries가 격자 계열을 광역 무효화한다 (codex 리뷰 4)
      invalidateGridQueries(queryClient, gridId);
      callbacks?.onDeleted?.();
    },
    onError: () => callbacks?.onError?.(),
  });
};

export interface SetVideoVisibilityInput {
  videoId: number;
  visibility: VideoVisibility;
}

/**
 * 공개 범위 전환 (AC 2) — `PATCH /api/videos/{videoId}/visibility`.
 * 성공 시 단건 재생(playback — 메뉴 ✓의 소스)과 격자 전역 영상 목록(공개 전환으로
 * 타인 노출 여부가 변한다)을 무효화한다. 같은 값 재선택 미발사 판정은 호출부
 * (shouldPatchVisibility) 몫.
 * 요청이 진행 중이면 재발사를 무시한다(선착 우선) — 메뉴 재오픈으로 PATCH가 겹치면
 * 늦게 도착한 구 요청이 최신 전환을 덮는 순서 역전이 가능하다 (codex 리뷰 2).
 * 창은 1 RTT뿐이고 성공 무효화가 ✓를 재동기화하므로 무시가 가장 단순한 결정적 동작이다.
 */
export const useSetVideoVisibility = (callbacks?: { onError?: () => void }) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: SetVideoVisibilityInput, context) =>
      setVisibilityFn(
        {
          path: { videoId: input.videoId },
          body: { visibility: input.visibility },
        },
        context,
      ),
    onSuccess: (_data, { videoId }) => {
      void queryClient.invalidateQueries({
        queryKey: getPlaybackQueryKey({ path: { videoId } }),
      });
      invalidateAllOf(
        queryClient,
        getGridGlobalVideosQueryKey({ path: { gridId: "" } }),
      );
    },
    onError: () => callbacks?.onError?.(),
  });

  const mutate = (input: SetVideoVisibilityInput): void => {
    if (mutation.isPending) return; // in-flight 가드 — 동시 PATCH 차단
    mutation.mutate(input);
  };

  return { ...mutation, mutate };
};

export interface ReportVideoInput {
  videoId: number;
  reasonId: ReportReasonId;
}

/**
 * 영상 신고 (AC 6·8) — `POST /api/videos/{videoId}/reports`, FE 사유 id를 서버
 * enum으로 매핑해 전송한다(detail은 OTHER 전용이라 미전송 — 추정 4).
 * 신고는 즉시 블라인드가 아니라(관리자 승인 시 조치) 화면 데이터가 변하지 않는다 —
 * 대응하는 조회 캐시 무효화가 없는 것은 의도다.
 * 중복 신고(11409/409) 분기는 호출부가 reportFailureNotice로 판정한다.
 */
export const useReportVideo = (callbacks?: {
  onReported?: () => void;
  onFailed?: (error: unknown) => void;
}) =>
  // 신고 성공은 조회 데이터를 바꾸지 않아 무효화 대상이 없다 (규칙 오탐 — 위 JSDoc)
  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation
  useMutation({
    mutationFn: (input: ReportVideoInput, context) =>
      reportFn(
        {
          path: { videoId: input.videoId },
          body: { reason: toServerReportReason(input.reasonId) },
        },
        context,
      ),
    onSuccess: () => callbacks?.onReported?.(),
    onError: (error) => callbacks?.onFailed?.(error),
  });
