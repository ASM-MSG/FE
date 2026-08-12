import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션은 barrel(generated/index.ts) 미재수출 — 직접 경로 import (use-auth-mutations 관례)
import {
  getMeQueryKey,
  issueProfileImagePresignedUrlMutation,
  updateProfileImageMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import type { GetMeResponse } from "@/shared/api/generated";
import { mergeProfileImage } from "./profile-image";
import { uploadProfileImage } from "./upload-profile-image";

// 생성 팩토리는 mutationFn을 항상 채운다 — 타입만 optional이라 !로 좁힌다 (use-auth-mutations 관례)
const issuePresignFn = issueProfileImagePresignedUrlMutation().mutationFn!;
const confirmFn = updateProfileImageMutation().mutationFn!;

/**
 * 프로필 이미지 업로드 훅 (MSG-378 기준 11) — uploadProfileImage 오케스트레이션의 웹 포트 구현.
 * - presign·확정: 생성 SDK mutationFn + 봉투 언랩 (httpClient 파이프라인 — Authorization·에러 정규화)
 * - S3 PUT: **raw fetch** — httpClient를 타면 baseUrl·Authorization·봉투 언랩이 붙어
 *   presigned 요청이 깨진다. 비2xx는 fetch가 reject하지 않으므로 response.ok를 명시 검사한다
 * - 성공 시 확정 응답을 getMe 캐시(getMeQueryKey — MSG-329 전환으로 ["profile"] 대체)의
 *   봉투 data에 병합(setQueryData) — profileImageUrl만. invalidate 대신 setQueryData를
 *   유지한다 — 확정 응답(UserProfileResponseDto)이 변경 후 상태의 정본이라 재조회 왕복이 잉여다
 */
export const useProfileImageUpload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // 생성 mutationFn은 (variables, context) 2인자 — context를 그대로 위임 전달한다 (use-auth-mutations 관례)
    mutationFn: (file: File, context) =>
      uploadProfileImage(
        { name: file.name, type: file.type, size: file.size },
        {
          issuePresign: async (params) =>
            unwrapEnvelope(await issuePresignFn({ body: params }, context)),
          putToS3: async ({ uploadUrl, contentType }) => {
            const response = await fetch(uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": contentType },
            });
            if (!response.ok)
              throw new Error(`S3 업로드 실패 (HTTP ${response.status})`);
          },
          confirm: async (s3Key) =>
            unwrapEnvelope(await confirmFn({ body: { s3Key } }, context)),
        },
      ),
    onSuccess: (confirmed) => {
      queryClient.setQueryData<GetMeResponse>(getMeQueryKey(), (prev) =>
        prev === undefined
          ? prev
          : { ...prev, data: mergeProfileImage(prev.data, confirmed) },
      );
    },
  });
};
