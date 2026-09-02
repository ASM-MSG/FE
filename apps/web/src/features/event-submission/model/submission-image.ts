import { ApiError } from "@/shared/api/api-error";
import type { EventSubmissionImagePresignRequestDto } from "@/shared/api/generated";

/**
 * 행사 대표 이미지 업로드 순수 로직 (MSG-546 AC 7·8) — 상수·검증·presign 파라미터 도출·
 * 실패 문구. 플랫폼 File·DOM 무참조(중립 후보 `{name,type,size}`만 받는다) —
 * features/profile/model/profile-image 선례를 따른 신규 구현이다.
 * 값은 프로필과 다르다: 허용 형식 jpg·jpeg·png(webp 없음) · 상한 10MB (서버 계약).
 */

/** 파일 선택 accept — jpg·jpeg·png만 (서버가 webp를 받지 않는다) */
export const SUBMISSION_IMAGE_ACCEPT = "image/jpeg,image/png";

/** 최대 대표 이미지 크기 — 10MB(바이트). 경계값 10MB 정확히는 허용 */
export const MAX_SUBMISSION_IMAGE_BYTES = 10 * 1024 * 1024;

/** 이미지 입력 안내 문구 (Figma 4A~C) */
export const SUBMISSION_IMAGE_HINT = "권장 16:9 · JPG 또는 PNG · 최대 10MB";

/** 확장자 → 짝이 맞는 MIME 타입 (서버가 쌍 일치를 요구한다) */
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/** 검증·도출 대상 — 플랫폼 File이 아닌 이름·MIME·용량만 담은 중립 형태 (RN 경계) */
export interface SubmissionImageCandidate {
  name: string;
  type: string;
  size: number;
}

/** 크기가 10MB 이하인지 판정한다 — 경계 10MB 포함 (AC 7) */
export const isWithinSubmissionImageSize = (size: number): boolean =>
  size <= MAX_SUBMISSION_IMAGE_BYTES;

/**
 * 중립 후보에서 presign 요청 파라미터를 도출한다 (AC 7).
 * 확장자는 점 없이 소문자로 정규화하고, 허용 외 확장자·확장자 없음·MIME 불일치는 무효(null)다.
 */
export const toImagePresignParams = (
  candidate: SubmissionImageCandidate,
): EventSubmissionImagePresignRequestDto | null => {
  const dot = candidate.name.lastIndexOf(".");
  if (dot < 0) return null;
  const extension = candidate.name.slice(dot + 1).toLowerCase();
  const expected = EXTENSION_CONTENT_TYPES[extension];
  if (expected === undefined || expected !== candidate.type) return null;
  return {
    extension,
    contentType: candidate.type,
    contentLength: candidate.size,
  };
};

/** 클라이언트 형식 무효 — presign 요청 없이 거른 경우 (AC 8) */
export class SubmissionImageFormatError extends Error {
  constructor() {
    super("대표 이미지 형식 무효");
    this.name = "SubmissionImageFormatError";
  }
}

/** 클라이언트 용량 초과 — presign 요청 없이 거른 경우 (AC 8) */
export class SubmissionImageSizeError extends Error {
  constructor() {
    super("대표 이미지 용량 초과");
    this.name = "SubmissionImageSizeError";
  }
}

const FORMAT_MESSAGE = "JPG 또는 PNG 이미지만 올릴 수 있어요";
const SIZE_MESSAGE = "10MB 이하의 이미지만 올릴 수 있어요";
/** presign 발급 실패 — 앱 API 경유라 ApiError로 정규화돼 온다 */
const PRESIGN_MESSAGE = "이미지 업로드 준비에 실패했어요. 다시 시도해 주세요";
/** S3 직접 PUT 실패·네트워크 실패 */
const PUT_MESSAGE = "이미지 업로드에 실패했어요. 다시 시도해 주세요";

/**
 * 이미지 실패를 단계별 안내 문구로 매핑한다 (AC 8) — 검증(형식·용량)과
 * 업로드(presign·PUT)가 각각 다른 문구다. 실패 후 재선택은 항상 가능하다.
 */
export const submissionImageErrorMessage = (error: unknown): string => {
  if (error instanceof SubmissionImageFormatError) return FORMAT_MESSAGE;
  if (error instanceof SubmissionImageSizeError) return SIZE_MESSAGE;
  if (error instanceof ApiError) return PRESIGN_MESSAGE;
  return PUT_MESSAGE;
};
