import type { UploadVideo } from "./upload-flow-store";

/**
 * 업로드 전 720p H.264/AAC 변환의 판정·조립 순수 함수 (MSG-616 D2·D4·D5·D7).
 *
 * 네이티브 호출(`react-native-compressor`)은 `api/video-transcoder.ts`에 가둔다 — 여기는
 * "변환할까"·"어느 크기로"·"결과를 스토어 `video`로 어떻게 바꾸나"만 담아 vitest로 고정한다.
 *
 * 목적은 BE 짝 티켓 MSG-615의 remux 게이트(**비디오 h264 && 코딩 height ≤720 && 오디오
 * aac/무음**)를 통과하는 파일을 만드는 것이다. 통과하면 서버가 재인코딩 없이 `-c copy`로
 * 끝내(<3s), 실패하면 기존 인코딩 경로로 떨어질 뿐이라 **변환 실패는 사용자에게 보이지 않는다**.
 */

/** 네이티브 변환 결과 — 출력 파일의 메타(`getVideoMetaData`)까지 확보한 뒤의 값 */
export interface TranscodeOutcome {
  /** `file://…/<uuid>.mp4` — Android cacheDir / iOS NSTemporaryDirectory */
  uri: string;
  width: number;
  height: number;
  /** bytes */
  size: number;
  /** seconds */
  duration: number;
}

/**
 * 변환 상한(ms) — 네이티브가 멈추면 뒤로가기 없는 분석 화면에 갇히므로 반드시 끝을 둔다.
 * 180초 상한 영상의 예상 변환(~60초) 대비 2배 여유(스펙 추정 A).
 */
export const TRANSCODE_TIMEOUT_MS = 120_000;

/** 재진입 판정 — 변환본을 다시 변환하면 화질 손실 + 시간 낭비. 실패 후 재개의 재시도는 허용 */
export const shouldTranscode = (video: UploadVideo): boolean =>
  !video.transcoded;

/**
 * 라이브러리 `maxSize`는 **긴 변** 상한이다. BE remux 게이트는 **코딩 height ≤720**이라 긴 변을
 * 720으로 고정하면 축·비율·회전 태그와 무관하게 항상 통과한다 — 세로 405×720(실측 404, 인코더 정렬),
 * 가로 720×405.
 *
 * codex 리뷰로 D2(가로 1280 / 세로 720 분기)를 폐기했다: 분기 재료였던 `getVideoMetaData`의
 * width/height는 iOS naturalSize·Android 원 메타라 **90° 회전 태그 영상(폰 촬영본 대부분)에서 축을
 * 오판**해 1280을 고르고(→코딩 height 1280, 게이트 탈락), 4:3 가로는 긴 변 1280이 height 960이 된다.
 * 둘 다 서버 재인코딩으로 떨어져 티켓 목적이 무너진다. 가로 1280×720을 포기하는 대가는 폰 세로 촬영
 * 중심 서비스라 수용 — 가로가 중요해지면 BE 게이트를 `min(w,h) ≤720`으로 바꾸는 쪽이 맞다.
 */
export const TRANSCODE_MAX_SIZE = 720;

/** 원본 파일명의 확장자를 `.mp4`로 — presign `extension` 판정 재료라 컨테이너와 맞아야 한다 */
const toMp4FileName = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");
  return `${dot > 0 ? fileName.slice(0, dot) : fileName}.mp4`;
};

/**
 * 변환본으로 스토어 `video`를 교체할 값 (AC 1). `fileSize`·`mimeType`이 그대로 presign
 * `contentLength`·`contentType`·S3 PUT 헤더로 흘러가므로 원본 값이 어디에도 남지 않는다(AC 3).
 * `durationSec`은 picker와 같은 규칙(초 반올림)이라 길이 뱃지·추천 범위 계산이 일관된다.
 */
export const toTranscodedVideo = (
  original: UploadVideo,
  outcome: TranscodeOutcome,
): UploadVideo => ({
  uri: outcome.uri,
  durationSec: Math.round(outcome.duration),
  fileName: toMp4FileName(original.fileName),
  fileSize: outcome.size,
  mimeType: "video/mp4",
  transcoded: true,
});
