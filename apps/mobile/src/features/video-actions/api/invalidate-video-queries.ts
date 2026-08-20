import type { QueryClient } from "@tanstack/react-query";
import {
  getCollectionGridsQueryKey,
  getPlaybackQueryKey,
  getRegionVideosQueryKey,
  getStatByPointQueryKey,
  getSummaryQueryKey,
} from "../../../shared/api/query-options";
import { invalidateGridQueries } from "../../upload/api/invalidate-grid-queries";

/**
 * 영상 삭제·공개 범위 전환 후의 캐시 처리 (MSG-431 L6·L7).
 *
 * 훅이 아니라 순수 배선 함수로 분리한 이유: 모바일에는 RN 렌더 테스트 인프라가 없어
 * (vitest.config 정책) 훅 안에 무효화를 두면 단정할 지점이 사라진다. 웹은 같은 로직을
 * `use-video-mutations` 안에 두고 렌더 테스트로 덮는다.
 */

/**
 * 파라미터로 캐시 키가 갈라지는 쿼리의 전 파라미터 무효화 — 생성 키의 식별자(`_id`)만
 * 남긴 부분 키(TanStack 부분 일치). `invalidate-grid-queries`의 점령 격자 관례와 동일하며,
 * 생성 `createQueryKey`가 무한 쿼리에만 `_infinite: true`를 **추가**하므로 무한 쿼리도
 * 같은 부분 키에 매칭된다.
 */
const invalidateAllOf = (
  queryClient: QueryClient,
  [key]: [{ _id: string }],
): void => {
  void queryClient.invalidateQueries({ queryKey: [{ _id: key._id }] });
};

export interface DeletedVideoRef {
  videoId: number;
  /** 삭제된 영상이 채우던 격자 — 목록 응답·라우트 셀 id 어느 쪽에서든 확보된다 */
  gridId: string;
}

/**
 * 삭제 성공 후 무효화 집합 [L6] — 웹 `useDeleteVideo`의 키 구성을 그대로 이식했다.
 *
 * 도감 계열(수집 요약·수집 격자·동 영상 목록·행정동 수집률)은 삭제로 수치가 전부 변하고,
 * 격자 계열은 `invalidateGridQueries`가 소유한다(점령·격자 상세·영상 2종·통계 + 잔디 이력 —
 * "격자의 내 영상이 모두 사라지면 점령 롤백" 명세 대응). 잔디 이력을 여기서 다시 부르지
 * 않는 것은 중복이기 때문이다.
 *
 * 삭제된 영상의 playback 캐시는 **제거**한다 — 무효화면 재조회가 404로 끝난다.
 */
export const invalidateAfterVideoDelete = (
  queryClient: QueryClient,
  { videoId, gridId }: DeletedVideoRef,
): void => {
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
  invalidateGridQueries(queryClient, gridId);
};

/** playback 응답 봉투 중 이 배선이 건드리는 부분만 — 생성 타입 전체를 요구하지 않는다 */
interface PlaybackEnvelopeSlice {
  data: { visibility: string };
}

/**
 * 공개 범위 전환 성공 후 playback 캐시 seed [L7] — 응답의 visibility를 캐시에 직접 쓴다.
 *
 * **무효화하지 않는 것이 이 함수의 요점이다**(사용자 승인). `GET /api/videos/{videoId}`는
 * 명세상 조회수를 올리는 엔드포인트라(`viewCount: 이번 조회 증가 전 스냅샷`), 무효화로
 * 재조회하면 시트를 여닫을 때마다 조회수가 두 번씩 오른다. 전환 응답이 이미 전환 후
 * visibility를 주므로 재조회할 이유도 없다.
 *
 * 캐시가 없으면(시트를 연 적 없는 영상) 아무것도 만들지 않는다 — 빈 껍데기를 심으면
 * 다음 시트 오픈이 그 값을 최신으로 착각한다.
 */
export const seedPlaybackVisibility = (
  queryClient: QueryClient,
  videoId: number,
  visibility: string,
): void => {
  queryClient.setQueryData<PlaybackEnvelopeSlice>(
    getPlaybackQueryKey({ path: { videoId } }),
    (previous) =>
      previous === undefined
        ? previous
        : { ...previous, data: { ...previous.data, visibility } },
  );
};
