/**
 * 영상 업로드 파일 검증 — 순수 함수/상수 (MSG-117 AC14·AC15, MSG-352 B1).
 * 플랫폼 API(window·File·DOM 등)를 참조하지 않는다 — 이름·용량·초 단위 숫자만 받아
 * 판정하므로 RN 재사용 대상. duration 실측(미디어 메타데이터)은 UI 경계(use-video-duration)가
 * 담당하고, 여기서는 측정된 값의 한도 판정만 한다.
 */

/** 업로드 허용 영상 확장자(소문자). [AC14] */
export const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov"] as const;

/** 최대 업로드 용량 — 500MB(바이트). [AC14] */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

/** 최대 영상 길이 — 180초. [MSG-352 B1, 기존 60초 안내에서 상향] */
export const MAX_VIDEO_DURATION_SECONDS = 180;

/** 검증 대상 — 플랫폼 File이 아닌 이름·용량만 담은 중립 형태(RN 경계). */
export interface UploadCandidate {
  name: string;
  size: number;
}

/**
 * 파일명 확장자가 허용 목록(MP4·MOV)에 속하는지 판정한다. 대소문자 무관. [AC14]
 * 확장자가 없거나 빈 경우 무효.
 */
export const hasAllowedVideoExtension = (name: string): boolean => {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  const ext = name.slice(dot + 1).toLowerCase();
  return (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
};

/** 용량이 최대 허용치(500MB) 이하인지 판정한다. [AC14] */
export const isWithinSizeLimit = (size: number): boolean =>
  size <= MAX_UPLOAD_BYTES;

/** 실측 영상 길이(초)가 최대 허용치(180초) 이하인지 판정한다 — 경계 180초 포함. [MSG-352 B1] */
export const isWithinDurationLimit = (duration: number): boolean =>
  duration <= MAX_VIDEO_DURATION_SECONDS;

/** 확장자·용량을 모두 만족하는 유효 영상 파일인지 판정한다. [AC14] */
export const isValidVideoFile = (file: UploadCandidate): boolean =>
  hasAllowedVideoExtension(file.name) && isWithinSizeLimit(file.size);

/**
 * 업로드 버튼 활성/비활성 판정. [AC15 · Q5]
 * 유효 파일이 선택되면 true, 미선택(null)이거나 무효 파일이면 false.
 * 제목 입력은 제출 필수 조건이 아니다(Q5).
 */
export const canSubmitUpload = (
  file: UploadCandidate | null,
): file is UploadCandidate => file !== null && isValidVideoFile(file);
