import { useState } from "react";
import { ApiError } from "@/shared/api/api-error";
import {
  useAnalyzeVideo,
  useConfirmUpload,
  useReplaceVideo,
} from "@/features/upload/api/use-upload-mutations";
import { trimToSegment } from "@/features/upload/api/ffmpeg-trim";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { useUploadLocation } from "@/features/upload/model/use-upload-location";
import {
  clampSegment,
  fromServerHighlights,
  type HighlightSuggestion,
  type Segment,
} from "@/features/upload/model/highlight-selection";
import {
  getStepAfterAnalysis,
  resolveAnalysisFailure,
  type UploadStep,
} from "@/features/upload/model/upload-wizard";
import {
  UploadFlowError,
  type UploadStage,
} from "@/features/upload/model/upload-orchestration";
import {
  canSubmitUpload,
  isWithinDurationLimit,
  MAX_DURATION_SEC,
  type UploadCandidate,
} from "@/features/upload/model/upload-validation";
import {
  coversWholeVideo,
  MAX_TRIMMED_DURATION_SEC,
} from "@/features/upload/model/video-trim";
import {
  replaceGridLabel,
  wizardModeCopy,
} from "@/features/upload/model/wizard-mode";
import type { VideoVisibility } from "@/features/video-actions/model/video-menu";
import type { TrimState } from "./PreviewStep";
import { useVideoDuration } from "./use-video-duration";

/** 업로드 단계별 실패 안내 (B11 — 단계 구분 표시) */
const STAGE_FAILURE_MESSAGES: Record<UploadStage, string> = {
  presign: "업로드 준비에 실패했어요",
  s3put: "영상 업로드에 실패했어요",
  finalize: "게시에 실패했어요",
};

/** 선분석 실패 중 선택 스텝 복귀 사유 (B5) */
const SELECT_FAILURE_MESSAGES = {
  "corrupt-file": "영상을 분석할 수 없는 파일이에요. 다른 파일을 선택해주세요",
  "too-long": `영상이 너무 길어요 — 최대 ${MAX_DURATION_SEC}초까지 올릴 수 있어요`,
  "too-large": "파일이 너무 커요 — 500MB 이하 영상만 올릴 수 있어요",
} as const;

/** 흐름 실패에서 백엔드 developCode 추출 — 선분석 폴백 분기(B5)용 */
const developCodeOf = (error: unknown): number | undefined => {
  const cause = error instanceof UploadFlowError ? error.cause : error;
  return cause instanceof ApiError ? cause.developCode : undefined;
};

/**
 * 업로드 위저드 컨트롤러 훅 (MSG-329 — UploadModal 분해, 리뷰 반영).
 * 스텝 상태·선분석/트리밍/확정 오케스트레이션·실패 분기를 전부 소유하고,
 * UploadModal은 이 훅의 반환값으로 스텝 화면을 조립만 한다 — 동작 계약은 스모크
 * (upload-wizard-flow.smoke.test.tsx) 9케이스가 고정한다.
 */
export const useUploadWizard = () => {
  const open = useUploadModalStore((s) => s.open);
  const closeModal = useUploadModalStore((s) => s.closeModal);
  // 교체 모드 (MSG-415) — 대상이 있으면 확정만 PUT /api/videos/{videoId}로 간다
  const replaceTarget = useUploadModalStore((s) => s.replaceTarget);
  const replaceMode = replaceTarget !== null;
  const [file, setFile] = useState<UploadCandidate | null>(null);
  // 원본 File — duration 캡처·미리보기·선분석 업로드용(플랫폼 경계)
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("select");
  // 서버 선분석 추천 (B6) — 참조 고정을 위해 state 보유 (useHighlightSelection 리셋 기준)
  const [suggestions, setSuggestions] = useState<HighlightSuggestion[]>([]);
  // 3502 폴백 — 직접 구간 지정 모드 (B5)
  const [manualFallback, setManualFallback] = useState(false);
  // 선택 스텝 복귀 사유 (B5 — 3426·3425·3413)
  const [selectFailure, setSelectFailure] = useState<string | null>(null);
  // 선분석 준비 단계(presign·PUT) 실패 — 로딩 모달에 재시도 표시 (B11)
  const [analyzingFailure, setAnalyzingFailure] = useState<UploadStage | null>(
    null,
  );
  // 확정된 선택 구간 → 미리보기·트리밍 입력 (B8)
  const [segment, setSegment] = useState<Segment | null>(null);
  const [trim, setTrim] = useState<TrimState>({ status: "idle" });
  // 확정 성공 → 완료 모달 (B13)
  const [completed, setCompleted] = useState(false);
  // 공개 범위 (MSG-476 AC 1~4) — 기본 PUBLIC, 스텝 왕복으로는 유지되고 close에서만 초기화
  const [visibility, setVisibility] = useState<VideoVisibility>("PUBLIC");

  const {
    duration,
    objectUrl,
    error: videoLoadError,
  } = useVideoDuration(rawFile);
  // 교체 모드는 좌표 미전송(격자 유지) — 뷰포트 중심 역지오코딩 조회가 불필요하다 (추정 1)
  const location = useUploadLocation(open && !replaceMode);
  const analyze = useAnalyzeVideo();
  const confirm = useConfirmUpload();
  const replaceVideo = useReplaceVideo();

  // 180초 초과 — FE 1차 검증 사유 표시 + [다음] 비활성 (B1)
  const durationTooLong = duration !== null && !isWithinDurationLimit(duration);
  const canProceed =
    canSubmitUpload(file) &&
    duration !== null &&
    !videoLoadError &&
    !durationTooLong;

  // 확정 진행 중 — 모드별로 실제 발사되는 뮤테이션은 하나뿐이다 (publish 분기)
  const submitting = confirm.isPending || replaceVideo.isPending;

  // 진행 중 = 닫기·중복 게시 차단 (B12)
  const busy = analyze.isPending || trim.status === "trimming" || submitting;

  /** 트리밍 산출 objectURL 정리 — 원본 objectURL(useVideoDuration 소관)은 건드리지 않는다 */
  const revokeTrim = () => {
    if (
      trim.status === "ready" &&
      trim.objectUrl !== null &&
      trim.objectUrl !== objectUrl
    ) {
      URL.revokeObjectURL(trim.objectUrl);
    }
    setTrim({ status: "idle" });
  };

  // 닫힐 때마다 전체 초기화 — 재오픈 시 이전 파일·스텝·진행 상태가 남지 않는다
  const close = () => {
    revokeTrim();
    setFile(null);
    setRawFile(null);
    setStep("select");
    setSuggestions([]);
    setManualFallback(false);
    setSelectFailure(null);
    setAnalyzingFailure(null);
    setSegment(null);
    setCompleted(false);
    setVisibility("PUBLIC"); // 다음 업로드가 이전 선택을 상속하지 않는다 (MSG-476 AC 4)
    analyze.reset();
    analyze.resetFlow();
    confirm.reset();
    confirm.resetFlow();
    replaceVideo.reset();
    replaceVideo.resetFlow();
    // closeModal이 replaceTarget도 해제한다 — 다음 일반 업로드의 교체 오발사 차단 (AC 6)
    closeModal();
  };

  // Esc·scrim은 Radix onOpenChange(false)로 전달 — 진행 중에는 무시한다 (B12)
  const handleOpenChange = (next: boolean) => {
    if (!next && busy) return;
    if (!next) close();
  };

  const handleSelectFile = (candidate: UploadCandidate, source: File) => {
    setFile(candidate);
    setRawFile(source);
    setSelectFailure(null);
    // 다른 파일 = 새 흐름 — 이전 presign·PUT 산출물 재사용 방지
    analyze.reset();
    analyze.resetFlow();
  };

  /** 선분석 실행 (B3) — 성공 시 highlights 유무로 하이라이트/미리보기 분기 (B4) */
  const runAnalysis = async (source: File) => {
    if (duration === null) return;
    setStep("analyzing");
    setAnalyzingFailure(null);
    try {
      const highlights = await analyze.mutateAsync(source);
      const list = fromServerHighlights(highlights, duration);
      setSuggestions(list);
      setManualFallback(false);
      if (getStepAfterAnalysis(highlights) === "preview") {
        // 추천 없음(5초 이하 등) — 전체 구간(상한 28초 클램프)으로 바로 미리보기 (B4)
        goPreview(clampSegment({ start: 0, end: duration }, duration));
      } else {
        setStep("highlight");
      }
    } catch (error) {
      handleAnalysisError(error);
    }
  };

  const handleAnalysisError = (error: unknown) => {
    // 준비 단계(presign·원본 PUT) 실패 — 로딩 모달에서 단계 구분 표시 + 재시도 (B11)
    if (error instanceof UploadFlowError && error.stage !== "finalize") {
      setAnalyzingFailure(error.stage);
      return;
    }
    const failure = resolveAnalysisFailure(developCodeOf(error));
    if (failure.step === "select") {
      // 파일 자체 문제(3426·3425·3413) — 선택 스텝 복귀 + 다른 파일 선택 유도 (B5)
      setSelectFailure(SELECT_FAILURE_MESSAGES[failure.kind]);
      setFile(null);
      setRawFile(null);
      analyze.reset();
      analyze.resetFlow();
      setStep("select");
    } else {
      // 3502·네트워크 등 — 직접 구간 지정 폴백 + 재분석 가능 (B5)
      setSuggestions([]);
      setManualFallback(true);
      setStep("highlight");
    }
  };

  /** 미리보기 진입 — 선택 구간으로 트리밍 시작 (B8) */
  const goPreview = (selected: Segment) => {
    setSegment(selected);
    setStep("preview");
    void prepareTrim(selected);
  };

  const prepareTrim = async (selected: Segment) => {
    if (rawFile === null || duration === null) return;
    // 전체 구간이면 원본 그대로 — wasm 로드 생략
    if (coversWholeVideo(selected, duration)) {
      setTrim({
        status: "ready",
        blob: rawFile,
        durationSec: duration,
        objectUrl,
      });
      return;
    }
    setTrim({ status: "trimming" });
    try {
      const result = await trimToSegment(rawFile, selected);
      setTrim({
        status: "ready",
        blob: result.blob,
        durationSec: result.durationSec,
        objectUrl: URL.createObjectURL(result.blob),
      });
    } catch {
      // HEVC MOV 등 로컬 측정·컷 실패 (리스크 4) — 안내 + 재시도
      setTrim({
        status: "error",
        message: "영상을 자르지 못했어요. 다시 시도해주세요",
      });
    }
  };

  /**
   * [업로드하기]/[교체하기] (B9·MSG-415 AC 3) — 교체 대상이 있으면 확정만
   * PUT /api/videos/{videoId}(좌표 미전송)로 간다. 실패 시 단계 구분 표시,
   * 재클릭 재시도는 성공 단계 스킵 (B11 재사용).
   */
  const publish = async () => {
    if (trim.status !== "ready" || submitting) return;
    const durationSec = Math.min(
      MAX_TRIMMED_DURATION_SEC,
      Math.max(1, Math.round(trim.durationSec)),
    );
    try {
      if (replaceTarget !== null) {
        await replaceVideo.mutateAsync({
          blob: trim.blob,
          durationSec,
          videoId: replaceTarget.videoId,
          gridId: replaceTarget.gridId,
        });
      } else {
        await confirm.mutateAsync({
          blob: trim.blob,
          lat: location.center.lat,
          lng: location.center.lng,
          durationSec,
          // 선택 UI의 공개 범위 — PUBLIC도 명시 전송 (MSG-476 AC 2, 추정 2)
          visibility,
        });
      }
      setCompleted(true);
    } catch {
      // 실패 표시는 활성 뮤테이션 error 파생 (submitFailureMessage)
    }
  };

  // 모드별 활성 확정 뮤테이션의 실패만 표시한다 — 다른 모드의 잔존 에러 오표시 방지
  const finalizeError = replaceMode ? replaceVideo.error : confirm.error;
  const submitFailureMessage = (
    replaceMode ? replaceVideo.isError : confirm.isError
  )
    ? STAGE_FAILURE_MESSAGES[
        finalizeError instanceof UploadFlowError
          ? finalizeError.stage
          : "finalize"
      ]
    : null;

  // 하이라이트 스텝을 거쳤으면 미리보기에서 되돌아갈 수 있다
  const wentThroughHighlight = suggestions.length > 0 || manualFallback;
  const backToHighlight = () => {
    revokeTrim();
    confirm.reset();
    // 부분 진행(s3PutDone·옛 s3Key)까지 초기화 — 다른 구간으로 재게시하면 처음부터
    // presign→PUT을 다시 밟아야 한다. 빠뜨리면 새로 자른 영상이 업로드되지 않은 채
    // 직전 구간의 s3Key로 확정되는 정합성 버그가 된다 (리뷰 반영)
    confirm.resetFlow();
    // 교체 모드도 동일한 정합성 규칙 — 옛 s3Key로 교체 확정되는 경로 차단 (MSG-415)
    replaceVideo.reset();
    replaceVideo.resetFlow();
    setStep("highlight");
  };

  return {
    open,
    step,
    completed,
    file,
    suggestions,
    manualFallback,
    selectFailure,
    analyzingFailureMessage:
      analyzingFailure !== null
        ? STAGE_FAILURE_MESSAGES[analyzingFailure]
        : null,
    segment,
    trim,
    duration,
    objectUrl,
    videoLoadError,
    // 교체 모드는 대상 영상의 격자 라벨 — 미확보면 null(생략) (추정 1)
    locationLabel:
      replaceTarget !== null
        ? replaceGridLabel(replaceTarget.zoneName, replaceTarget.zoneCell)
        : location.label,
    /** 모드별 확정 버튼·완료 모달 문구 (AC 2, 추정 3) */
    copy: wizardModeCopy(replaceMode),
    // 공개 범위 — 교체 모드는 DTO에 필드가 없어 선택 미노출(null) (MSG-476 AC 11)
    visibility: replaceMode ? null : visibility,
    setVisibility,
    durationTooLong,
    canProceed,
    busy,
    submitting,
    submitFailureMessage,
    wentThroughHighlight,
    close,
    handleOpenChange,
    handleSelectFile,
    /** 선택된 원본으로 선분석 시작/재시도 — 파일이 없으면 무동작 */
    startAnalysis: () => {
      if (rawFile !== null) void runAnalysis(rawFile);
    },
    /** 선분석 실패 모달 [취소] — 선택 스텝 복귀 */
    cancelAnalysis: () => {
      setAnalyzingFailure(null);
      setStep("select");
    },
    goPreview,
    /** 트리밍 실패 재시도 — 구간이 없으면 무동작 */
    retryTrim: () => {
      if (segment !== null) void prepareTrim(segment);
    },
    publish,
    backToHighlight,
  };
};
