import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import {
  highlightPreview,
  issuePresignedUrl,
  replace,
  upload,
} from "@/shared/api/generated/sdk.gen";
import type { PresignedUrlRequestDto } from "@/shared/api/generated";
import { httpClient } from "@/shared/api/http-client";
import type { VideoVisibility } from "@/features/video-actions/model/video-menu";
import { PRESIGN_PURPOSE } from "../model/presign-purpose";
import {
  createOrchestration,
  type OrchestrationState,
  runUploadFlow,
  UploadFlowError,
} from "../model/upload-orchestration";
import { invalidateUploadSurfaces } from "./invalidate-upload-surfaces";
import { startReadyRefresh } from "./start-ready-refresh";
import { uploadToS3 } from "./s3-upload";

/**
 * 업로드 뮤테이션 훅 (MSG-329 B3·B9·B13) — 선분석·확정 각각 presign → S3 PUT → 확정
 * 단계열(upload-orchestration)을 구동한다. 실패 시 진행 상태를 보존해 재시도가 성공
 * 단계를 건너뛴다(B11). S3 PUT은 전역 fetch 어댑터(s3-upload) — httpClient 미경유(B10).
 */

/**
 * 선분석 호출 전용 타임아웃 (리스크 3) — httpClient의 ky 기본 타임아웃은 10초인데
 * highlight-preview는 동기 5~30초(부하 시 3배) 응답이라 그대로면 항상 타임아웃이다.
 * 이 호출에 한해 여유 있게 연장한다 (인증 파이프라인 훅은 extend로 그대로 승계).
 */
const ANALYSIS_TIMEOUT_MS = 120_000;
const analysisHttpClient = httpClient.extend({ timeout: ANALYSIS_TIMEOUT_MS });

const presignEffect = (body: PresignedUrlRequestDto) => async () => {
  const { data } = await issuePresignedUrl({ body, throwOnError: true });
  return unwrapEnvelope(data);
};

/** 파일명 확장자(소문자, 점 없이) — presign 요청용 */
const fileExtension = (name: string): string => {
  const dot = name.lastIndexOf(".");
  return dot >= 0 && dot < name.length - 1
    ? name.slice(dot + 1).toLowerCase()
    : "mp4";
};

/** MIME 타입 → 확장자 — 트리밍 생략 시 원본(MOV 가능)이 그대로 확정 업로드된다 */
const extensionFromType = (type: string): string =>
  type === "video/quicktime" ? "mov" : "mp4";

/**
 * AI 하이라이트 선분석 (B3) — presign(purpose=HIGHLIGHT_PREVIEW) → 원본 S3 PUT →
 * `POST /api/videos/highlight-preview`. 결과는 highlights 시간쌍 배열(없으면 null).
 * 실패는 UploadFlowError(단계 표기)로 도착한다 — 확정 단계 실패의 developCode 분기는
 * 호출부가 resolveAnalysisFailure로 판정한다(B5).
 * 캐시 무효화가 없는 것은 의도다 — 선분석 결과는 서버 비저장 임시값이라 대응하는 조회
 * 캐시 자체가 없다 (react-doctor query-mutation-missing-invalidation은 오탐).
 */
export const useAnalyzeVideo = () => {
  // 지연 초기화 — 렌더마다 초기 상태 객체를 만들었다 버리지 않는다 (리뷰 반영)
  const flowState = useRef<OrchestrationState | null>(null);
  // 선분석 결과는 서버 비저장 임시값 — 대응 조회 캐시가 없어 무효화 대상이 없다 (규칙 오탐)
  // oxlint-disable-next-line react-doctor/query-mutation-missing-invalidation
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        const { state, result } = await runUploadFlow(
          (flowState.current ??= createOrchestration()),
          {
            presign: presignEffect({
              extension: fileExtension(file.name),
              contentType: file.type || "video/mp4",
              contentLength: file.size,
              purpose: PRESIGN_PURPOSE.highlightPreview,
            }),
            putToS3: (presign) => uploadToS3(presign.uploadUrl, file),
            finalize: async (s3Key) => {
              const { data } = await highlightPreview({
                body: { s3Key },
                throwOnError: true,
                fetch: analysisHttpClient,
              });
              return unwrapEnvelope(data).highlights;
            },
          },
        );
        flowState.current = state;
        return result;
      } catch (error) {
        // 진행 상태 보존 — 재시도 시 성공 단계(presign·PUT)를 건너뛴다 (B11)
        if (error instanceof UploadFlowError) flowState.current = error.state;
        throw error;
      }
    },
  });
  /** 다른 파일 선택 시 초기화 — 이전 파일의 presign·PUT 산출물 재사용 방지 */
  const resetFlow = () => {
    flowState.current = createOrchestration();
  };
  return { ...mutation, resetFlow };
};

export interface ReplaceVideoInput {
  /** 잘린 최종 영상 — 트리밍 생략(전체 구간) 시 원본 File 그대로 */
  blob: Blob;
  /** 잘린 영상 실측 길이(초) — 업로드와 동일한 1~30 클램프 (AC 3) */
  durationSec: number;
  /** 교체 대상 영상 */
  videoId: number;
  /** 격자 쿼리 무효화 대상 — 미확보면 null(광역 무효화) */
  gridId: string | null;
}

/**
 * 영상 교체 확정 (MSG-415 AC 3·4·5) — useConfirmUpload 미러. presign(purpose
 * 미전송=UPLOAD) → 새 영상 S3 PUT → `PUT /api/videos/{videoId}`(s3Key·durationSec·
 * recordedAt만 — 좌표 생략=격자 유지, 추정 1. visibility는 교체 DTO에 없어
 * 미전송=기존 공개 범위 유지, MSG-476 AC 11). 성공 시 playback(썸네일·상태 최신화)·
 * 도감 동 영상 목록(부분 키)·격자 쿼리 무효화. 실패 시 진행 상태를 보존해
 * 재시도가 성공 단계를 건너뛴다(B11 재사용).
 */
export const useReplaceVideo = () => {
  const queryClient = useQueryClient();
  const flowState = useRef<OrchestrationState | null>(null);
  const mutation = useMutation({
    mutationFn: async (input: ReplaceVideoInput) => {
      try {
        const { state, result } = await runUploadFlow(
          (flowState.current ??= createOrchestration()),
          {
            presign: presignEffect({
              extension: extensionFromType(input.blob.type),
              contentType: input.blob.type || "video/mp4",
              contentLength: input.blob.size,
              // purpose 미전송 = UPLOAD — 확정 업로드와 동일 (AC 3)
            }),
            putToS3: (presign) => uploadToS3(presign.uploadUrl, input.blob),
            finalize: async (s3Key) => {
              const { data } = await replace({
                path: { videoId: input.videoId },
                body: {
                  s3Key,
                  durationSec: input.durationSec,
                  // recordedAt = 교체 시각 (업로드 결정 B 준용)
                  recordedAt: new Date().toISOString(),
                  // lat·lng 미전송 = 격자 유지 (추정 1 — 좌표 전송은 GRID_MISMATCH 위험)
                },
                throwOnError: true,
              });
              return unwrapEnvelope(data);
            },
          },
        );
        flowState.current = state;
        return result;
      } catch (error) {
        if (error instanceof UploadFlowError) flowState.current = error.state;
        throw error;
      }
    },
    onSuccess: (_video, { videoId, gridId }) => {
      // 확정이 바꾼 화면 전부 (AC 4·MSG-414 AC 11) — 블러 통지 파이프라인은 삭제됐고
      // READY 재무효화 책임만 남았다 (MSG-476 AC 7)
      invalidateUploadSurfaces(queryClient, { videoId, gridId });

      // 교체본도 새 인코딩을 거친다 — READY 전이에서 같은 집합을 다시 싣는다
      startReadyRefresh(queryClient, videoId, gridId);
    },
  });
  const resetFlow = () => {
    flowState.current = createOrchestration();
  };
  return { ...mutation, resetFlow };
};

export interface ConfirmUploadInput {
  /** 잘린 최종 영상 — 트리밍 생략(전체 구간) 시 원본 File 그대로 */
  blob: Blob;
  /** 촬영 위치 = 지도 뷰포트 중심 (결정 A) */
  lat: number;
  lng: number;
  /** 잘린 영상 실측 길이(초) — 보정 재컷으로 ≤30 보장 (B8) */
  durationSec: number;
  /** 공개 범위 — 사용자 선택값을 PUBLIC 포함 항상 명시 전송 (MSG-476 AC 2, 추정 2) */
  visibility: VideoVisibility;
}

/**
 * 업로드 확정 (B9) — presign(purpose 미전송=UPLOAD) → 잘린 영상 S3 PUT →
 * `POST /api/videos`(s3Key·lat·lng·durationSec·recordedAt=업로드 시각·visibility).
 * 성공 시 점령 격자·격자 상세 invalidate(B13).
 */
export const useConfirmUpload = () => {
  const queryClient = useQueryClient();
  // 지연 초기화 — 렌더마다 초기 상태 객체를 만들었다 버리지 않는다 (리뷰 반영)
  const flowState = useRef<OrchestrationState | null>(null);
  const mutation = useMutation({
    mutationFn: async (input: ConfirmUploadInput) => {
      try {
        const { state, result } = await runUploadFlow(
          (flowState.current ??= createOrchestration()),
          {
            presign: presignEffect({
              extension: extensionFromType(input.blob.type),
              contentType: input.blob.type || "video/mp4",
              contentLength: input.blob.size,
              // purpose 미전송 = UPLOAD (B9)
            }),
            putToS3: (presign) => uploadToS3(presign.uploadUrl, input.blob),
            finalize: async (s3Key) => {
              const { data } = await upload({
                body: {
                  s3Key,
                  lat: input.lat,
                  lng: input.lng,
                  durationSec: input.durationSec,
                  // recordedAt = 업로드 시각 (결정 B — 파일 메타 추출은 범위 제외)
                  recordedAt: new Date().toISOString(),
                  // 공개 범위 — 기본값(PUBLIC)도 생략 없이 선택값 그대로 (MSG-476 AC 2)
                  visibility: input.visibility,
                },
                throwOnError: true,
              });
              return unwrapEnvelope(data);
            },
          },
        );
        flowState.current = state;
        return result;
      } catch (error) {
        if (error instanceof UploadFlowError) flowState.current = error.state;
        throw error;
      }
    },
    onSuccess: (video) => {
      // 확정이 바꾼 화면 전부 (B13·MSG-414 AC 11). 블러 통지 파이프라인은 삭제됐다
      invalidateUploadSurfaces(queryClient, {
        videoId: video.videoId,
        gridId: video.gridId,
      });

      // 확정 시점 재조회는 서버가 아직 non-READY라 새 영상을 빼고 응답한다.
      // READY가 되는 순간 같은 집합을 한 번 더 무효화해야 새로고침 없이 보인다
      // (QA 회귀 실측 2026-08-26)
      startReadyRefresh(queryClient, video.videoId, video.gridId);
    },
  });
  const resetFlow = () => {
    flowState.current = createOrchestration();
  };
  return { ...mutation, resetFlow };
};
