import { useMutation } from "@tanstack/react-query";
import { uploadToS3 } from "@/features/upload/api/s3-upload";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (use-profile-image-upload 관례)
import { issueImagePresignedUrlMutation } from "@/shared/api/generated/@tanstack/react-query.gen";
import {
  isWithinSubmissionImageSize,
  SubmissionImageFormatError,
  SubmissionImageSizeError,
  toImagePresignParams,
} from "../model/submission-image";

// 생성 팩토리는 mutationFn을 항상 채운다 — 타입만 optional이라 !로 좁힌다 (기존 관례)
const issuePresignFn = issueImagePresignedUrlMutation().mutationFn!;

/**
 * 대표 이미지 업로드 오케스트레이션 (MSG-546 AC 7·8) —
 * 검증(형식·MIME 쌍·10MB) → presign 발급 → S3 직접 PUT → s3Key 반환.
 *
 * 실패 단계가 구분돼 전파된다: 검증 실패는 네트워크를 타지 않고(FormatError·SizeError),
 * presign 실패는 `ApiError`, S3 PUT 실패는 일반 Error다 —
 * 문구 매핑은 `submissionImageErrorMessage`(순수)가 한다.
 * S3 PUT은 `features/upload`의 `uploadToS3`를 재사용한다(전역 fetch로 앱 헤더 유출 차단 —
 * cross-feature import는 MSG-411 invalidateGridQueries 선례).
 */
export const useSubmissionImageUpload = () =>
  useMutation({
    // 생성 mutationFn은 (variables, context) 2인자 — context를 그대로 위임 전달한다
    mutationFn: async (file: File, context): Promise<string> => {
      const params = toImagePresignParams({
        name: file.name,
        type: file.type,
        size: file.size,
      });
      if (params === null) throw new SubmissionImageFormatError();
      if (!isWithinSubmissionImageSize(file.size)) {
        throw new SubmissionImageSizeError();
      }

      const presigned = unwrapEnvelope(
        await issuePresignFn({ body: params }, context),
      );
      await uploadToS3(presigned.uploadUrl, file);
      return presigned.s3Key;
    },
  });
