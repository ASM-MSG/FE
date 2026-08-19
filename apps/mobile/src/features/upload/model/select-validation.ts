import {
  hasAllowedVideoExtension,
  isWithinDurationLimit,
  isWithinSizeLimit,
  MAX_DURATION_SEC,
} from "./upload-validation";
import type { UploadVideo } from "./upload-flow-store";

/**
 * 선택 직후 사전 검증 (구현 계획 Phase 3 — 현행 화면에는 검증이 아예 없다).
 * 서버 3426·3425·3413을 부르기 전에 같은 기준(upload-validation)으로 FE가 먼저 거른다:
 * 원본 전체를 트리밍 없이 올리는 구조(D1)에서 500MB 파일을 JS 힙에 통째로 읽는 일을
 * 사전에 막는 1차 방어이기도 하다(R3 완화 ①).
 *
 * picker가 길이·용량을 주지 않으면 진행할 수 없다 — presign의 `contentLength`를 만들 수
 * 없고 180초 상한도 판정할 수 없기 때문이다. 추측값으로 올리면 서버가 거부하거나
 * 잘못된 길이가 기록되므로 선택 단계에서 되돌린다.
 *
 * **길이 하한은 일부러 두지 않는다.** `SEGMENT_MIN_SEC = 5`는 직접 구간 지정 슬라이더의
 * 최소 *구간* 길이(기준 14)이지 영상 자체의 최소 길이가 아니다. 서버는 `durationSec`을
 * 1초부터 받고, `highlight-preview` 명세가 "5초 미만 원본이면 빈 배열 — 추천 없음이니
 * FE는 추천 단계를 스킵한다"고 **짧은 영상을 정상 경로로 규정**한다(기준 4·5의 추천 없음
 * 분기가 그것이다). 여기에 하한을 넣으면 서버가 허용하는 영상을 FE가 거부하게 된다.
 */
export const SELECTION_REJECTION_MESSAGES = {
  extension: "MP4·MOV 영상만 올릴 수 있어요",
  size: "파일이 너무 커요 — 500MB 이하 영상만 올릴 수 있어요",
  duration: `영상이 너무 길어요 — 최대 ${MAX_DURATION_SEC}초까지 올릴 수 있어요`,
  unknown: "영상 정보를 확인할 수 없어요. 다른 영상을 선택해주세요",
} as const;

/** 거부 사유 문구 — 통과하면 null */
export const resolveSelectionRejection = (
  video: UploadVideo,
): string | null => {
  if (!hasAllowedVideoExtension(video.fileName)) {
    return SELECTION_REJECTION_MESSAGES.extension;
  }
  if (video.fileSize === null || video.durationSec === null) {
    return SELECTION_REJECTION_MESSAGES.unknown;
  }
  if (!isWithinSizeLimit(video.fileSize)) {
    return SELECTION_REJECTION_MESSAGES.size;
  }
  if (!isWithinDurationLimit(video.durationSec)) {
    return SELECTION_REJECTION_MESSAGES.duration;
  }
  return null;
};
