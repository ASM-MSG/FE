import { unwrapEnvelope } from "../../../shared/api/envelope";
import { httpClient } from "../../../shared/api/http-client";
import {
  highlightPreview,
  issuePresignedUrl,
  upload,
  upload1,
  type EventVideoUploadResponseDto,
  type PresignedUrlRequestDto,
  type VideoUploadResponseDto,
} from "../../../shared/api/sdk";
import type { ConfirmUploadInput } from "../model/confirm-input";
import type { UploadFlowEffects } from "../model/upload-orchestration";
import { uploadFileToS3 } from "./s3-upload";

/**
 * 업로드 단계열의 주입 이펙트 (기준 23·24) — `runUploadFlow`가 실행할
 * presign / S3 PUT / 확정을 선분석·게시 각각으로 조립한다.
 *
 * 훅(use-upload-mutations)이 아니라 여기 있는 이유: 모바일에는 컴포넌트·훅 렌더 테스트
 * 인프라가 없어(vitest.config 주석) 훅 안에 묻으면 "무엇이 어떤 순서로 나가는가"를
 * 고정할 수단이 사라진다. 순수 팩토리로 빼면 네트워크 경계 스텁만으로 계약을 관찰할 수
 * 있다(upload-effects.test.ts).
 */

/**
 * 선분석 호출 전용 타임아웃 (R4) — httpClient의 ky 기본 타임아웃은 10초인데
 * `highlight-preview`는 동기 5~30초(부하 시 3배) 응답이라 그대로면 **정상 분석이 항상
 * 타임아웃한다.** 이 호출에 한해 연장한다 (인증 파이프라인 훅은 extend로 그대로 승계).
 */
export const ANALYSIS_TIMEOUT_MS = 120_000;
export const analysisHttpClient = httpClient.extend({
  timeout: ANALYSIS_TIMEOUT_MS,
});

/**
 * presign 발급 용도 — 스웨거가 purpose를 enum이 아닌 pattern 문자열로 선언해 생성 타입이
 * 넓게 풀린다. 유효값을 여기 한 곳에 고정한다(웹 `presign-purpose.ts`와 같은 취지 —
 * 모바일은 사용처가 선분석 1곳뿐이라 상수 파일을 따로 두지 않는다).
 * 확정 업로드는 purpose를 **보내지 않는다** = 서버 기본값 UPLOAD.
 */
const HIGHLIGHT_PREVIEW_PURPOSE = "HIGHLIGHT_PREVIEW" satisfies NonNullable<
  PresignedUrlRequestDto["purpose"]
>;

/** 파일명 확장자(소문자, 점 없이) — presign 요청용 */
const fileExtension = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot >= 0 && dot < name.length - 1
    ? name.slice(dot + 1).toLowerCase()
    : "mp4";
};

const presignEffect = (body: PresignedUrlRequestDto) => async () => {
  const { data } = await issuePresignedUrl({ body, throwOnError: true });
  return unwrapEnvelope(data);
};

/** 선분석·확정이 공유하는 원본 파일 메타 */
export interface UploadSource {
  uri: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * AI 하이라이트 선분석 (기준 23) — presign(purpose=HIGHLIGHT_PREVIEW) → 원본 S3 PUT →
 * `POST /api/videos/highlight-preview`. 결과는 highlights 시간쌍 배열(없으면 null).
 * 실패는 단계가 표기된 UploadFlowError로 도착하고, 확정 단계 실패의 developCode 분기는
 * 호출부가 `resolveAnalysisFailure`로 판정한다(기준 32·33).
 */
export const buildAnalyzeEffects = (
  source: UploadSource,
): UploadFlowEffects<number[][] | null | undefined> => ({
  presign: presignEffect({
    extension: fileExtension(source.fileName),
    contentType: source.contentType,
    contentLength: source.fileSize,
    purpose: HIGHLIGHT_PREVIEW_PURPOSE,
  }),
  putToS3: (presign) =>
    uploadFileToS3(presign.uploadUrl, source.uri, source.contentType),
  finalize: async (s3Key) => {
    const { data } = await highlightPreview({
      body: { s3Key },
      throwOnError: true,
      fetch: analysisHttpClient,
    });
    return unwrapEnvelope(data).highlights;
  },
});

/**
 * 업로드 확정 (기준 24) — presign(purpose 미전송=UPLOAD) → 원본 S3 PUT →
 * `POST /api/videos`(s3Key·lat·lng·durationSec·recordedAt=업로드 시각·visibility).
 * visibility는 PUBLIC도 **명시 전송**한다(MSG-572 D6) — 서버 "생략 시 PUBLIC"에 기대지 않아
 * 선택값=전송값이 단정 하나로 고정된다.
 *
 * 환류 F1 — **선택 구간을 전달할 필드가 없다.** `VideoUploadRequestDto`에 startSec/endSec
 * (또는 highlight: [start, end])이 없다. 그래서 여기서 올리는 것은 잘라낸 구간이 아니라
 * **선택한 원본 파일 전체**이고(`input.uri` = picker가 준 원본), 결과적으로
 * (a) 사용자가 고른 구간이 서버에 도달하지 않으며
 * (b) S3에 올라간 실제 파일의 길이와 body에 싣는 `durationSec`(=선택 구간 길이, D1)이 어긋난다.
 * 웹은 ffmpeg.wasm 클라이언트 트리밍으로 이 구멍을 메웠으나 모바일에는 그 수단이 없고,
 * 티켓이 모바일 트리밍을 제외 범위로 뒀다 — 백엔드에 필드 추가를 요청해야 한다(D1·R1·F1).
 * **의도된 구조적 공백이므로 코드로 고치지 말 것** (리뷰 반복 방지).
 *
 * MSG-560 D12 — 행사 귀속(input.event)이면 확정만 갈라진다:
 * `POST /api/event-occurrences/{occurrenceId}/locations/{locationId}/videos`(upload1)로
 * path 귀속하고 body는 `s3Key·durationSec·recordedAt`뿐이다(좌표 없음 — DTO에 필드가 없다).
 * presign·S3 PUT 단계는 두 모드가 같다(행사 전용 presign purpose 없음). 응답
 * `EventVideoUploadResponseDto`는 `{videoId, gridId, …}`라 성공 정산 인자와 구조 호환이다.
 */
/** 확정 응답 — 일반·행사 두 명세 모두 `{videoId, gridId, …}`를 가진다 (성공 정산 입력) */
export type ConfirmUploadResult =
  | VideoUploadResponseDto
  | EventVideoUploadResponseDto;

export const buildConfirmEffects = (
  input: ConfirmUploadInput,
): UploadFlowEffects<ConfirmUploadResult> => ({
  presign: presignEffect({
    extension: fileExtension(input.fileName),
    contentType: input.contentType,
    contentLength: input.fileSize,
    // purpose 미전송 = UPLOAD
  }),
  putToS3: (presign) =>
    uploadFileToS3(presign.uploadUrl, input.uri, input.contentType),
  finalize: async (s3Key) => {
    if (input.event !== undefined) {
      const { data } = await upload1({
        path: {
          occurrenceId: input.event.occurrenceId,
          locationId: input.event.locationId,
        },
        body: {
          s3Key,
          durationSec: input.durationSec,
          recordedAt: new Date().toISOString(),
        },
        throwOnError: true,
      });
      return unwrapEnvelope(data);
    }
    const { data } = await upload({
      body: {
        s3Key,
        lat: input.lat,
        lng: input.lng,
        // 선택 구간 길이 — 원본 길이가 아니다 (D1, 위 환류 F1)
        durationSec: input.durationSec,
        // recordedAt = 업로드 시각 (파일 메타 추출은 범위 제외 — 웹 결정 B 준용)
        recordedAt: new Date().toISOString(),
        visibility: input.visibility,
      },
      throwOnError: true,
    });
    return unwrapEnvelope(data);
  },
});
