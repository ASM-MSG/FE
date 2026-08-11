import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import {
  highlightPreview,
  issuePresignedUrl,
  upload,
} from "@/shared/api/generated/sdk.gen";
import type { PresignedUrlRequestDto } from "@/shared/api/generated";
import { httpClient } from "@/shared/api/http-client";
import { PRESIGN_PURPOSE } from "../model/presign-purpose";
import { useProcessingStore } from "../model/processing-store";
import {
  createOrchestration,
  type OrchestrationState,
  runUploadFlow,
  UploadFlowError,
} from "../model/upload-orchestration";
import { invalidateGridQueries } from "./invalidate-grid-queries";
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
 */
export const useAnalyzeVideo = () => {
  const flowState = useRef<OrchestrationState>(createOrchestration());
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        const { state, result } = await runUploadFlow(flowState.current, {
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
        });
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

export interface ConfirmUploadInput {
  /** 잘린 최종 영상 — 트리밍 생략(전체 구간) 시 원본 File 그대로 */
  blob: Blob;
  /** 촬영 위치 = 지도 뷰포트 중심 (결정 A) */
  lat: number;
  lng: number;
  /** 잘린 영상 실측 길이(초) — 보정 재컷으로 ≤30 보장 (B8) */
  durationSec: number;
}

/**
 * 업로드 확정 (B9) — presign(purpose 미전송=UPLOAD) → 잘린 영상 S3 PUT →
 * `POST /api/videos`(s3Key·lat·lng·durationSec·recordedAt=업로드 시각, visibility 미전송).
 * 성공 시 처리 대기 등록(B15) + 점령 격자·격자 상세 invalidate(B13).
 */
export const useConfirmUpload = () => {
  const queryClient = useQueryClient();
  const track = useProcessingStore((s) => s.track);
  const flowState = useRef<OrchestrationState>(createOrchestration());
  const mutation = useMutation({
    mutationFn: async (input: ConfirmUploadInput) => {
      try {
        const { state, result } = await runUploadFlow(flowState.current, {
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
              },
              throwOnError: true,
            });
            return unwrapEnvelope(data);
          },
        });
        flowState.current = state;
        return result;
      } catch (error) {
        if (error instanceof UploadFlowError) flowState.current = error.state;
        throw error;
      }
    },
    onSuccess: (video) => {
      // 블러 처리 대기 등록 — AppLayout 상주 워처가 이 스토어 구독으로 폴링을 시작한다 (B14·B15)
      track(video.videoId, Date.now());

      // B13 — 격자 쿼리 무효화 (invalidate-grid-queries 공용 — READY 전이와 공유)
      invalidateGridQueries(queryClient, video.gridId);
    },
  });
  const resetFlow = () => {
    flowState.current = createOrchestration();
  };
  return { ...mutation, resetFlow };
};
