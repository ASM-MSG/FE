import {
  PROFILE_IMAGE_ACCEPT,
  PROFILE_IMAGE_SIZE_MESSAGE,
  ProfileImageFormatError,
  isWithinProfileImageSize,
  profileImageErrorMessage,
  type ProfileImageCandidate,
} from "./profile-image";

/**
 * 픽커 자산 → 업로드 후보 변환 (MSG-564 기준 2, 결정 D3) — 앱 고유 순수 함수.
 * 웹은 `<input accept>`가 형식을 걸러 주지만 expo-image-picker에는 MIME 필터가 없어 heic 등이
 * 그대로 온다 — 형식·크기 검증을 요청 전에 여기서 끝낸다. 문구는 `profile-image.ts`의 것을
 * 그대로 쓴다(형식 문구는 비공개 상수라 `profileImageErrorMessage` 경유로 얻는다 — 웹 포팅
 * 모듈 무수정).
 */

/** expo-image-picker ImagePickerAsset의 구조적 부분집합 — fileSize는 호출부가 실측해 채운다 */
export interface ProfileImageAssetLike {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize: number;
}

export type ProfileImagePick =
  | { kind: "ok"; uri: string; candidate: ProfileImageCandidate }
  | { kind: "rejected"; message: string };

const FORMAT_MESSAGE = profileImageErrorMessage(new ProfileImageFormatError());
const ACCEPTED_MIME_TYPES = PROFILE_IMAGE_ACCEPT.split(",");

/** MIME → 확장자 — 허용 3종만 (서버가 받는 jpg·jpeg·png·webp 중 대표 하나씩) */
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * presign `extension`의 재료가 될 파일명. 픽커가 fileName을 주면 그대로 쓰고, 없으면
 * uri 마지막 세그먼트를, 그것에도 확장자가 없으면(안드로이드 `content://`) MIME에서 파생해 붙인다
 * (upload `pick-result.resolveFileName`과 같은 규칙).
 */
const resolveFileName = (asset: ProfileImageAssetLike, mimeType: string) => {
  const fromUri = asset.uri.split("?")[0].split("/").pop() ?? "";
  const name = asset.fileName ?? fromUri;
  if (name.includes(".")) return name;
  return `${name || "image"}.${EXTENSION_BY_MIME[mimeType]}`;
};

/**
 * - MIME이 없거나 허용 밖 → 형식 문구 거부
 * - 5MB 초과 → 크기 문구 거부 (경계 5MB 허용)
 * - 그 외 → 업로드 후보 (`uploadProfileImage` 입력)
 */
export const toProfileImageCandidate = (
  asset: ProfileImageAssetLike,
): ProfileImagePick => {
  const mimeType = asset.mimeType ?? "";
  if (!ACCEPTED_MIME_TYPES.includes(mimeType)) {
    return { kind: "rejected", message: FORMAT_MESSAGE };
  }
  if (!isWithinProfileImageSize(asset.fileSize)) {
    return { kind: "rejected", message: PROFILE_IMAGE_SIZE_MESSAGE };
  }
  return {
    kind: "ok",
    uri: asset.uri,
    candidate: {
      name: resolveFileName(asset, mimeType),
      type: mimeType,
      size: asset.fileSize,
    },
  };
};

/**
 * 픽커가 `fileSize`를 안 줄 때(안드로이드 `content://` 일부)의 실측 (스펙 Q2).
 * 프로필 이미지는 5MB 상한이라 메모리로 읽어도 문제 없다 — 영상 플로우가 null을 거부하는
 * 이유(500MB 적재)가 여기 없고, 정상 사진을 메타 누락으로 반려하는 쪽이 더 나쁜 UX다.
 */
export const measureFileSize = async (uri: string): Promise<number> => {
  // 로컬 파일 읽기도 fetch라 4xx/5xx에 reject하지 않는다 — ok를 보지 않으면 에러 본문 길이를
  // 파일 크기로 오판한다 (`s3-upload.ts` 선례 미러)
  const file = await fetch(uri);
  if (!file.ok) {
    throw new Error(`이미지 파일을 읽을 수 없어요 (HTTP ${file.status})`);
  }
  return (await file.arrayBuffer()).byteLength;
};
