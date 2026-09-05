import type { VideoVisibility } from "../../video-actions/model/video-menu";
import type { EventUploadTarget } from "./event-upload-target";
import type { Segment } from "./highlight-selection";
import type { UploadVideo } from "./upload-flow-store";

/**
 * 업로드 확정 입력 조립 (기준 25·26, D1·D8) — 화면이 가진 3가지(선택 영상·선택 구간·좌표)를
 * `api/upload-effects.buildConfirmEffects`가 받는 형태로 바꾸는 순수 함수.
 *
 * **`durationSec`은 원본 길이가 아니라 선택 구간 길이다** — 웹 `use-upload-wizard.ts:257`이
 * 트리밍된 구간 길이를 보내는 것과 같은 의미다. `highlight-selection`이 구간을 5~28초로
 * 보장하므로 반올림 후에도 서버 제약(1~30)을 항상 만족한다.
 *
 * 좌표는 `resolveMapCenter()` 결과를 그대로 받는다(D8) — 모바일에는 지도 뷰포트 스토어가
 * 없어 웹의 "뷰포트 중심" 대신 현재 위치(실패 시 서면 폴백)를 정본으로 삼는다.
 *
 * MSG-560 D12 — **행사 모드는 좌표를 싣지 않는다.** 귀속이 URL path(회차·위치)로 결정되고
 * `EventVideoUploadRequestDto`에 lat/lng가 없다. 두 모드를 유니온으로 갈라 소비처
 * (`buildConfirmEffects`)가 `input.event` 유무만으로 좁힐 수 있게 한다.
 *
 * MSG-572 D4·D5 — 일반 분기만 `visibility`를 **필수**로 싣는다(`EventVideoUploadRequestDto`에는
 * 필드가 없다). `buildConfirmInput`의 5번째 인자도 기본값 없는 필수다: 기본값을 두면 호출부
 * 누락이 조용히 PUBLIC으로 나가 "선택값=전송값"(AC 3 명시 전송)이 뒤집힌다.
 */

/** 서버 계약 상한 — `POST /api/videos`의 durationSec은 1~30 */
export const CONFIRM_DURATION_MAX_SEC = 30;
const CONFIRM_DURATION_MIN_SEC = 1;

interface ConfirmUploadBase {
  /** 업로드할 원본 파일 uri — 트리밍하지 않는다 (D1, 환류 F1) */
  uri: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  /** 선택 구간 길이(초, 1~30) */
  durationSec: number;
}

/** 행사 귀속 대상 — path 파라미터로 나간다 (MSG-560 D12) */
export interface EventConfirmTarget {
  occurrenceId: number;
  locationId: number;
}

export type ConfirmUploadInput = ConfirmUploadBase &
  (
    | {
        event: EventConfirmTarget;
        lat?: undefined;
        lng?: undefined;
        visibility?: undefined;
      }
    | {
        event?: undefined;
        lat: number;
        lng: number;
        visibility: VideoVisibility;
      }
  );

const clampedDuration = (segment: Segment): number =>
  Math.min(
    CONFIRM_DURATION_MAX_SEC,
    Math.max(CONFIRM_DURATION_MIN_SEC, Math.round(segment.end - segment.start)),
  );

export const buildConfirmInput = (
  video: UploadVideo,
  segment: Segment,
  center: { lat: number; lng: number } | null,
  eventTarget: EventUploadTarget | null,
  visibility: VideoVisibility,
): ConfirmUploadInput => {
  const base = {
    uri: video.uri,
    fileName: video.fileName,
    // 사전 검증(select-validation)을 통과한 영상만 여기 도달한다 — null은 형식상의 잔여
    fileSize: video.fileSize ?? 0,
    contentType: video.mimeType ?? "video/mp4",
    durationSec: clampedDuration(segment),
  };

  // 일반 업로드는 `canPublishUpload`가 center 확보를 보장한다 — null은 형식상의 잔여
  // (fileSize와 같은 관례). 행사 모드에서만 center 없이 호출된다.
  return eventTarget === null
    ? { ...base, lat: center?.lat ?? 0, lng: center?.lng ?? 0, visibility }
    : {
        ...base,
        event: {
          occurrenceId: eventTarget.occurrenceId,
          locationId: eventTarget.locationId,
        },
      };
};

/**
 * `[업로드하기]` 발사 가능 판정 (codex 리뷰 P2) — 버튼 비활성 조건과 발사 가드가 **같은
 * 규칙**을 쓰게 하는 순수 함수.
 *
 * 특히 `center`는 `resolveMapCenter()`가 비동기라 진입 직후 잠시 null이다. 그동안 버튼이
 * 활성이면 눌러도 발사 함수가 조용히 반환해 사용자에게는 주 동작이 고장난 것으로 보인다.
 */
export const canPublishUpload = (input: {
  video: UploadVideo | null;
  segment: Segment | null;
  center: { lat: number; lng: number } | null;
  /** 확정 진행 중 — 중복 발사 차단은 스토어 동기 잠금이 하고, 여기는 버튼 표시용 (기준 35) */
  submitting: boolean;
  /** 행사 귀속 업로드면 좌표를 보내지 않으므로 측위를 기다리지 않는다 (MSG-560 D12) */
  eventTarget?: EventUploadTarget | null;
}): boolean =>
  !input.submitting &&
  input.video !== null &&
  input.segment !== null &&
  (input.center !== null || (input.eventTarget ?? null) !== null);
