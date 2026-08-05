import type { UploadVideo } from "./upload-flow-store";

/**
 * 권한·picker 결과 판정 순수 함수 (MSG-302 AC 8) — denied | canceled | picked.
 * expo-image-picker 결과의 구조적 부분집합 타입만 참조한다 — 플랫폼 API 호출은
 * ui 레이어(upload-screen)가 하고, 여기는 판정만 담당해 vitest로 검증한다.
 */

/** expo-image-picker ImagePickerAsset의 구조적 부분집합 — duration은 ms 단위 */
export interface PickerAssetLike {
  uri: string;
  duration?: number | null;
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

/**
 * - 권한 미승인 → denied (안내 표시, 이동 없음 — picker는 호출되지 않아 result null)
 * - 취소 → canceled (아무 동작 없음)
 * - 영상 확보 → picked (uri + durationSec: picker의 ms를 초로 반올림, 없으면 null)
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
    },
  };
};
