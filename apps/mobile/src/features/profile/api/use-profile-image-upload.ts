import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import {
  getMeQueryKey,
  issueProfileImagePresignedUrlMutation,
  updateProfileImageMutation,
} from "../../../shared/api/query-options";
import type {
  GetMeResponse,
  UserProfileResponseDto,
} from "../../../shared/api/sdk";
import { uploadFileToS3 } from "../../upload/api/s3-upload";
import {
  mergeProfileImage,
  type ProfileImageCandidate,
} from "../model/profile-image";
import { uploadProfileImage } from "../model/upload-profile-image";

// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const issuePresignFn = issueProfileImagePresignedUrlMutation().mutationFn!;
const confirmFn = updateProfileImageMutation().mutationFn!;

/** 화면이 넘기는 것 — 픽커 uri(S3 PUT이 읽는다) + 검증 끝난 후보(presign 파라미터 재료) */
export interface ProfileImageUploadVariables {
  uri: string;
  candidate: ProfileImageCandidate;
}

/**
 * 프로필 이미지 업로드 mutation 옵션 (MSG-564 기준 4·5) — `uploadProfileImage` 오케스트레이션의
 * 모바일 포트 구현. 웹 `use-profile-image-upload` 미러.
 * - presign·확정: 생성 SDK mutationFn + 봉투 언랩 (httpClient 파이프라인 — Authorization·에러 정규화)
 * - S3 PUT: `uploadFileToS3` **그대로 재사용** (결정 D5) — 전역 fetch + ArrayBuffer 바디.
 *   Blob 바디는 Expo winter fetch가 Content-Type을 덮어써 403이 난다(MSG-424, 그 파일 주석)
 * - 성공 시 확정 응답을 getMe 봉투 data에 `mergeProfileImage`로 병합(setQueryData)만 —
 *   invalidate 없음(결정 D7): 확정 응답이 변경 후 상태의 정본이라 재조회 왕복이 잉여다.
 *   실패하면 캐시를 건드리지 않아 화면이 이전 이미지를 유지한다.
 * 옵션 팩토리로 분리한 이유는 RN 렌더 테스트가 없어 테스트가 `MutationObserver`로
 * 이 객체를 직접 구동하기 때문이다 (MSG-426 관례).
 */
export const profileImageUploadMutationOptions = (
  queryClient: QueryClient,
): UseMutationOptions<
  UserProfileResponseDto,
  Error,
  ProfileImageUploadVariables
> => ({
  // 생성 mutationFn은 (variables, context) 2인자 — context를 그대로 위임 전달한다
  mutationFn: ({ uri, candidate }, context) =>
    uploadProfileImage(candidate, {
      issuePresign: async (params) =>
        unwrapEnvelope(await issuePresignFn({ body: params }, context)),
      putToS3: ({ uploadUrl, contentType }) =>
        uploadFileToS3(uploadUrl, uri, contentType),
      confirm: async (s3Key) =>
        unwrapEnvelope(await confirmFn({ body: { s3Key } }, context)),
    }),
  onSuccess: (confirmed) => {
    queryClient.setQueryData<GetMeResponse>(getMeQueryKey(), (previous) =>
      previous == null
        ? previous
        : { ...previous, data: mergeProfileImage(previous.data, confirmed) },
    );
  },
});

/** 화면이 쓰는 업로드 훅 — [저장] 시점에만 발사된다 (결정 D1) */
export const useProfileImageUpload = () => {
  const queryClient = useQueryClient();
  return useMutation(profileImageUploadMutationOptions(queryClient));
};
