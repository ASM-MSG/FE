import type { UploadVideo } from "./upload-flow-store";

/**
 * 권한·picker 결과 판정 순수 함수 (MSG-302 AC 8) — denied | canceled | picked.
 * expo-image-picker 결과의 구조적 부분집합 타입만 참조한다 — 플랫폼 API 호출은
 * ui 레이어(upload-screen)가 하고, 여기는 판정만 담당해 vitest로 검증한다.
 *
 * MSG-424 확장: presign(`extension`·`contentType`·`contentLength`)과 사전 검증
 * (select-validation)이 요구하는 파일 메타를 함께 캡처한다.
 */

/** expo-image-picker ImagePickerAsset의 구조적 부분집합 — duration은 ms 단위 */
export interface PickerAssetLike {
  uri: string;
  duration?: number | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
}

/** expo-image-picker ImagePickerResult의 구조적 부분집합 */
export interface PickerResultLike {
  canceled: boolean;
  assets?: PickerAssetLike[] | null;
}

export type PickOutcome =
  | { kind: "denied" }
  | { kind: "canceled" }
  | { kind: "picked"; video: UploadVideo };

/** MIME → 확장자 — MOV(quicktime)만 구분하면 허용 목록(MP4·MOV)을 덮는다 */
const extensionFromMimeType = (mimeType: string | null): string =>
  mimeType === "video/quicktime" ? "mov" : "mp4";

/**
 * presign `extension` 판정의 재료가 될 파일명.
 * picker가 fileName을 주면 **그대로 쓴다** — 여기서 확장자를 갈아 끼우면 허용 목록 검증
 * (select-validation)이 무력화된다. 안드로이드 `content://` 자산처럼 확장자가 없는 경우에만
 * MIME에서 파생해 붙인다(확장자 없음을 무조건 거부하면 정상 영상이 반려된다).
 */
const resolveFileName = (asset: PickerAssetLike): string => {
  const fromUri = asset.uri.split("?")[0].split("/").pop() ?? "";
  const candidate = asset.fileName ?? fromUri;
  if (candidate.includes(".")) return candidate;
  return `${candidate || "video"}.${extensionFromMimeType(asset.mimeType ?? null)}`;
};

/**
 * - 권한 미승인 → denied (안내 표시, 이동 없음 — picker는 호출되지 않아 result null)
 * - 취소 → canceled (아무 동작 없음)
 * - 영상 확보 → picked (uri + durationSec: picker의 ms를 초로 반올림, 없으면 null + 파일 메타)
 */
export const resolvePickOutcome = (
  granted: boolean,
  result: PickerResultLike | null,
): PickOutcome => {
  if (!granted) return { kind: "denied" };
  const asset = result && !result.canceled ? result.assets?.[0] : undefined;
  if (!asset) return { kind: "canceled" };
  return {
    kind: "picked",
    video: {
      uri: asset.uri,
      durationSec:
        asset.duration != null ? Math.round(asset.duration / 1000) : null,
      fileName: resolveFileName(asset),
      fileSize: asset.fileSize ?? null,
      mimeType: asset.mimeType ?? null,
    },
  };
};
