/**
 * 트리밍 끝점 보정 — 순수 계산 (B8). ffmpeg.wasm 스트림 카피(-c copy)는 키프레임
 * 경계에서 시작해 잘린 실측 길이가 선택 구간보다 길어질 수 있다. 실측이 명세 상한
 * (durationSec ≤ 30초)을 넘으면 초과분만큼 끝점을 앞당겨 재컷한다.
 * wasm 실행·실측은 어댑터(api/ffmpeg-trim.ts) 소관 — 여기는 숫자만 다룬다(RN 재사용 대상).
 */

import type { Segment } from "./highlight-selection";

/** 확정 영상 길이 상한 — 명세 VideoUploadRequestDto.durationSec 1~30초 (B8) */
export const MAX_TRIMMED_DURATION_SEC = 30;

/** 잘린 결과 실측이 30초를 초과하면 끝점 보정 재컷이 필요하다 (B8) */
export const needsEndpointRecut = (measuredSec: number): boolean =>
  measuredSec > MAX_TRIMMED_DURATION_SEC;

/**
 * 끝점 보정 — 실측 초과분만큼 끝점을 앞당긴다 (시작점 = 키프레임 앵커 유지). [B8]
 * 같은 키프레임에서 다시 시작하므로 재컷 실측은 상한으로 수렴한다.
 * 명세 하한(1초) 방어로 보정 후에도 최소 1초 길이는 남긴다.
 */
export const recutSegment = (
  segment: Segment,
  measuredSec: number,
): Segment => {
  const overshoot = measuredSec - MAX_TRIMMED_DURATION_SEC;
  return {
    start: segment.start,
    end: Math.max(segment.start + 1, segment.end - overshoot),
  };
};

/**
 * 선택 구간이 영상 전체를 덮는지 — 덮으면 트리밍 없이 원본을 그대로 쓴다
 * (5초 이하 스킵 흐름 등, wasm 로드 생략).
 */
export const coversWholeVideo = (segment: Segment, duration: number): boolean =>
  segment.start <= 0 && segment.end >= duration;
