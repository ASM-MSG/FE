import { type ReactNode, useState } from "react";
import { MapPin } from "lucide-react";
import { cn, DialogShell, ModalCard } from "@fillmap/ui-web";
import { ApiError } from "@/shared/api/api-error";
import {
  useAnalyzeVideo,
  useConfirmUpload,
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
import { coversWholeVideo } from "@/features/upload/model/video-trim";
import { AnalyzingModal } from "./AnalyzingModal";
import { HighlightStep } from "./HighlightStep";
import { PreviewStep, type TrimState } from "./PreviewStep";
import { UploadDropzone } from "./UploadDropzone";
import { useVideoDuration } from "./use-video-duration";

const MODAL_SUBTITLE = "지금 위치의 격자에 순간을 기록하세요";

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

/** 안내 박스 — 정적 프레젠테이션 */
const InfoBox = ({
  title,
  body,
  tone,
}: {
  title: string;
  body: ReactNode;
  tone: "soft" | "dark";
}) => (
  <div
    className={cn(
      "flex w-full flex-col gap-xxs rounded-md px-md py-sm text-left",
      tone === "dark" ? "bg-foreground" : "bg-surface-soft",
    )}
  >
    <span
      className={cn(
        "text-fm-body-strong",
        tone === "dark" ? "text-foreground-inverse" : "text-foreground",
      )}
    >
      {title}
    </span>
    <span
      className={cn(
        "text-fm-label",
        tone === "dark"
          ? "text-foreground-inverse/70"
          : "text-foreground-muted",
      )}
    >
      {body}
    </span>
  </div>
);

/**
 * 영상 업로드 모달 (MSG-329 — 디자인 ver 11 재편).
 * 스텝: 1/3 선택 → (AI 선분석 로딩) → 2/3 하이라이트 → 3/3 미리보기 → 확정 → 완료 모달.
 * 구 "블러 확인" 스텝은 폐기 — 블러는 게시 후 서버 자동이며 완료는 폴링 워처가 통지한다.
 * 두 진입점 공통 조상(AppLayout)에 1회 마운트되고 열림 상태는 전역 스토어가 관리한다.
 * 진행 중(선분석·트리밍·게시)에는 닫기(✕·ESC·바깥 클릭)와 중복 게시가 차단된다 (B12).
 */
export const UploadModal = () => {
  const open = useUploadModalStore((s) => s.open);
  const closeModal = useUploadModalStore((s) => s.closeModal);
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

  const {
    duration,
    objectUrl,
    error: videoLoadError,
  } = useVideoDuration(rawFile);
  const location = useUploadLocation(open);
  const analyze = useAnalyzeVideo();
  const confirm = useConfirmUpload();

  // 180초 초과 — FE 1차 검증 사유 표시 + [다음] 비활성 (B1)
  const durationTooLong = duration !== null && !isWithinDurationLimit(duration);
  const canProceed =
    canSubmitUpload(file) &&
    duration !== null &&
    !videoLoadError &&
    !durationTooLong;

  // 진행 중 = 닫기·중복 게시 차단 (B12)
  const busy =
    analyze.isPending || trim.status === "trimming" || confirm.isPending;

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
    analyze.reset();
    analyze.resetFlow();
    confirm.reset();
    confirm.resetFlow();
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
      const list = fromServerHighlights(highlights);
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

  /** [업로드하기] (B9) — 실패 시 단계 구분 표시, 재클릭 재시도는 성공 단계 스킵 (B11) */
  const handlePublish = async () => {
    if (trim.status !== "ready" || confirm.isPending) return;
    try {
      await confirm.mutateAsync({
        blob: trim.blob,
        lat: location.center.lat,
        lng: location.center.lng,
        durationSec: Math.min(30, Math.max(1, Math.round(trim.durationSec))),
      });
      setCompleted(true);
    } catch {
      // 실패 표시는 confirm.error 파생 (아래 submitFailureMessage)
    }
  };

  const submitFailureMessage = confirm.isError
    ? STAGE_FAILURE_MESSAGES[
        confirm.error instanceof UploadFlowError
          ? confirm.error.stage
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
    setStep("highlight");
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={handleOpenChange}
      srTitle="영상 업로드"
      scrollable
    >
      {completed ? (
        // 확정 성공 — 완료 모달 (B13). 블러 완료는 폴링 워처가 토스트로 통지한다 (B14·B16)
        <ModalCard
          title="업로드 완료!"
          description="잠시 후 AI가 영상 블러 처리를 마치면 알림으로 알려드릴게요"
          confirmText="확인"
          onConfirm={close}
          onClose={close}
        />
      ) : step === "analyzing" ? (
        <AnalyzingModal
          failureMessage={
            analyzingFailure !== null
              ? STAGE_FAILURE_MESSAGES[analyzingFailure]
              : null
          }
          onRetry={() => rawFile !== null && void runAnalysis(rawFile)}
          onCancel={() => {
            setAnalyzingFailure(null);
            setStep("select");
          }}
        />
      ) : step === "highlight" && duration !== null ? (
        <HighlightStep
          objectUrl={objectUrl}
          duration={duration}
          suggestions={suggestions}
          manualFallback={manualFallback}
          onRetryAnalysis={() => rawFile !== null && void runAnalysis(rawFile)}
          onNext={goPreview}
          onClose={close}
        />
      ) : step === "preview" && segment !== null ? (
        <PreviewStep
          trim={trim}
          segment={segment}
          locationLabel={location.label}
          onRetryTrim={() => segment !== null && void prepareTrim(segment)}
          onPublish={() => void handlePublish()}
          submitting={confirm.isPending}
          submitFailureMessage={submitFailureMessage}
          onBack={wentThroughHighlight ? backToHighlight : null}
          onClose={busy ? undefined : close}
        />
      ) : (
        <ModalCard
          title="영상 업로드"
          description={MODAL_SUBTITLE}
          cancelText="취소"
          confirmText="다음"
          confirmDisabled={!canProceed}
          onCancel={close}
          onConfirm={() => rawFile !== null && void runAnalysis(rawFile)}
          onClose={close}
        >
          <UploadDropzone
            selectedName={file?.name ?? null}
            onSelectFile={handleSelectFile}
          />

          {/* 길이 초과 사유 (B1) — [다음] 비활성 이유를 시각으로 알린다 */}
          {durationTooLong && (
            <p role="alert" className="text-fm-label text-error">
              영상이 너무 길어요 — 최대 {MAX_DURATION_SEC}초까지 올릴 수 있어요
            </p>
          )}
          {/* 선분석 실패로 선택 스텝 복귀한 사유 (B5) */}
          {selectFailure !== null && (
            <p role="alert" className="text-fm-label text-error">
              {selectFailure}
            </p>
          )}

          {/* 위치 태그 — 뷰포트 중심 행정동 (B2). "변경" UI는 제외 범위 — 미노출 (오탐 방지 5) */}
          <div className="flex w-full items-center gap-xs">
            <span className="shrink-0 text-fm-body-strong text-foreground">
              위치 태그
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-sm py-1.75 text-fm-label text-primary">
              <MapPin className="size-3" />
              {location.label}
            </span>
          </div>

          {/* 메타데이터 로드 실패 시 duration이 영구히 null로 남지 않고 원인을 안내한다 */}
          <InfoBox
            tone="soft"
            title="AI 하이라이트 자동 추천"
            body={
              videoLoadError
                ? "영상을 불러오지 못했어요. 다른 파일로 다시 시도해주세요"
                : "다음 단계에서 AI가 영상을 분석해 최적 하이라이트 구간을 추천해요"
            }
          />
          <InfoBox
            tone="dark"
            title="업로드 후 AI 자동 블러"
            body="게시 후 얼굴과 번호판을 자동으로 가려요. 처리가 끝나면 알려드릴게요"
          />
        </ModalCard>
      )}
    </DialogShell>
  );
};
