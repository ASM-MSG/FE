import { ApiError } from "@/shared/api/api-error";
import type {
  ProfileImagePresignRequestDto,
  UserProfileResponseDto,
} from "@/shared/api/generated";

/**
 * 프로필 이미지 업로드 순수 로직 (MSG-378) — 상수·검증·파라미터 도출·에러 문구·캐시 병합.
 * 플랫폼 API(File·DOM 등) 무참조 — 중립 형태만 받는 RN 재사용 대상 (upload-validation 선례).
 */

/**
 * 파일 선택 accept — jpeg·png·webp MIME 타입만 (기준 1, 추정 1).
 * heic·heif를 빼 iOS가 플랫폼 수준에서 JPEG로 변환하게 유도한다. jpg·jpeg는 image/jpeg로 커버.
 */
export const PROFILE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

/** 최대 프로필 이미지 크기 — 5MB(바이트). 경계값 5MB 정확히는 허용 (기준 2) */
export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;

/** 크기가 5MB 이하인지 판정한다 — 경계 5MB 포함 (기준 2) */
export const isWithinProfileImageSize = (size: number): boolean =>
  size <= MAX_PROFILE_IMAGE_BYTES;

/** 검증·도출 대상 — 플랫폼 File이 아닌 이름·MIME·용량만 담은 중립 형태 (RN 경계) */
export interface ProfileImageCandidate {
  name: string;
  type: string;
  size: number;
}

/**
 * 중립 후보에서 presign 요청 파라미터를 도출한다 (기준 3).
 * 확장자는 소문자 정규화, 확장자가 없거나 빈 이름(점 없음·"photo.")은 무효(null).
 */
export const toPresignParams = (
  candidate: ProfileImageCandidate,
): ProfileImagePresignRequestDto | null => {
  const dot = candidate.name.lastIndexOf(".");
  if (dot < 0) return null;
  const extension = candidate.name.slice(dot + 1).toLowerCase();
  if (extension === "") return null;
  return {
    extension,
    contentType: candidate.type,
    contentLength: candidate.size,
  };
};

/**
 * 클라이언트 형식 무효 판정 에러 (추정 2) — 확장자 없는 파일 등 presign 요청 없이
 * 거른 경우. profileImageErrorMessage가 서버 1415와 같은 형식 안내 문구로 매핑한다.
 */
export class ProfileImageFormatError extends Error {
  constructor() {
    super("프로필 이미지 형식 무효");
    this.name = "ProfileImageFormatError";
  }
}

/** 형식 불일치·허용 외 (developCode 1415 + 클라이언트 무효 판정) */
const FORMAT_MESSAGE = "jpg·jpeg·png·webp 형식의 이미지만 올릴 수 있어요";
/** 크기 초과 (developCode 1413 + 클라이언트 5MB 사전 검증) */
const SIZE_MESSAGE = "5MB 이하의 이미지만 올릴 수 있어요";
/** 확정 실패 — 내 pending 키 아님/확장자 없음(1401)·S3에 실제 없음(1402) */
const CONFIRM_MESSAGE = "이미지 반영에 실패했어요. 다시 시도해 주세요";
/** 그 외 — 네트워크·S3 업로드 실패 포함 */
const FALLBACK_MESSAGE =
  "이미지 업로드에 실패했어요. 잠시 후 다시 시도해 주세요";

/** 5MB 초과 사전 검증 안내 문구 — 서버 1413과 같은 문구를 화면 사전 검증(기준 10)이 재사용 */
export const PROFILE_IMAGE_SIZE_MESSAGE = SIZE_MESSAGE;

/**
 * 업로드 실패 에러를 사용자 안내 문구로 매핑한다 (기준 6).
 * ApiError의 developCode 분기 — 1415 형식 · 1413 크기 · 1401/1402 확정 실패,
 * 그 외(네트워크·S3 실패·미지 코드)는 일반 실패 문구.
 */
export const profileImageErrorMessage = (error: unknown): string => {
  if (error instanceof ProfileImageFormatError) return FORMAT_MESSAGE;
  if (!(error instanceof ApiError)) return FALLBACK_MESSAGE;
  switch (error.developCode) {
    case 1415:
      return FORMAT_MESSAGE;
    case 1413:
      return SIZE_MESSAGE;
    case 1401:
    case 1402:
      return CONFIRM_MESSAGE;
    default:
      return FALLBACK_MESSAGE;
  }
};

/**
 * 확정 응답을 기존 캐시 데이터(getMe 봉투의 data)에 병합한다 — profileImageUrl만 반영 (기준 7).
 * 이 뮤테이션이 바꾸는 값은 이미지뿐이다 — 나머지 필드(email·nickname·createdAt)는
 * 조회(getMe — MSG-329 전환)가 정본이라 여기서 덮지 않는다.
 */
export const mergeProfileImage = (
  prev: UserProfileResponseDto,
  confirmed: UserProfileResponseDto,
): UserProfileResponseDto => ({
  ...prev,
  profileImageUrl: confirmed.profileImageUrl,
});
