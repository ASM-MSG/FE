import type {
  ProfileImagePresignRequestDto,
  ProfileImagePresignResponseDto,
  UserProfileResponseDto,
} from "../../../shared/api/sdk";
import {
  ProfileImageFormatError,
  toPresignParams,
  type ProfileImageCandidate,
} from "./profile-image";

/**
 * 업로드 오케스트레이션 포트 (MSG-564 — 웹 `upload-profile-image.ts` 포팅, parity 테스트가
 * 고정한다). 네트워크·SDK 구현은 전부 주입받는다 — 모바일 포트 구현은
 * `api/use-profile-image-upload`(S3 PUT은 `features/upload/api/s3-upload`, MSG-424 winter fetch 해법).
 */
export interface ProfileImageUploadPorts {
  /** presigned URL 발급 — POST /api/users/me/profile-image/presigned-url */
  issuePresign: (
    params: ProfileImagePresignRequestDto,
  ) => Promise<ProfileImagePresignResponseDto>;
  /** S3 직접 PUT — presign 요청과 동일한 contentType을 헤더로 보내야 한다 (불일치 시 403) */
  putToS3: (args: { uploadUrl: string; contentType: string }) => Promise<void>;
  /** 변경 확정 — PUT /api/users/me/profile-image, 갱신된 프로필을 반환 */
  confirm: (s3Key: string) => Promise<UserProfileResponseDto>;
}

/**
 * presign → S3 PUT → 확정을 순서대로 정확히 1회씩 실행하고 확정 응답을 반환한다 (기준 3).
 * 각 단계 실패 시 후속 단계를 호출하지 않고 에러를 그대로 전파한다.
 * 확장자 없는 후보는 어떤 포트도 호출하지 않고 형식 무효로 거른다.
 */
export const uploadProfileImage = async (
  candidate: ProfileImageCandidate,
  ports: ProfileImageUploadPorts,
): Promise<UserProfileResponseDto> => {
  const params = toPresignParams(candidate);
  if (params === null) throw new ProfileImageFormatError();

  const presigned = await ports.issuePresign(params);
  await ports.putToS3({
    uploadUrl: presigned.uploadUrl,
    contentType: params.contentType,
  });
  return ports.confirm(presigned.s3Key);
};
