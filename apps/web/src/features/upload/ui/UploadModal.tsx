import { DialogShell, ModalCard } from "@fillmap/ui-web";
import { AnalyzingModal } from "./AnalyzingModal";
import { HighlightStep } from "./HighlightStep";
import { PreviewStep } from "./PreviewStep";
import { SelectStep } from "./SelectStep";
import { useUploadWizard } from "./use-upload-wizard";

/**
 * 영상 업로드 모달 (MSG-329 — 디자인 ver 11 재편, 리뷰 반영으로 분해).
 * 스텝: 1/3 선택 → (AI 선분석 로딩) → 2/3 하이라이트 → 3/3 미리보기 → 확정 → 완료 모달.
 * 구 "블러 확인" 스텝은 폐기 — 블러는 게시 후 서버 자동이며 완료는 폴링 워처가 통지한다.
 * 두 진입점 공통 조상(AppLayout)에 1회 마운트되고 열림 상태는 전역 스토어가 관리한다.
 * 진행 중(선분석·트리밍·게시)에는 닫기(✕·ESC·바깥 클릭)와 중복 게시가 차단된다 (B12).
 * 상태·오케스트레이션은 use-upload-wizard 훅 소유 — 이 컴포넌트는 스텝 조립만 한다.
 */
export const UploadModal = () => {
  const wizard = useUploadWizard();

  return (
    <DialogShell
      open={wizard.open}
      onOpenChange={wizard.handleOpenChange}
      srTitle="영상 업로드"
      scrollable
    >
      {wizard.completed ? (
        // 확정 성공 — 완료 모달 (B13). 문구는 모드별(업로드/교체 — MSG-415 추정 3),
        // 블러 완료는 폴링 워처가 토스트로 통지한다 (B14·B16)
        <ModalCard
          title={wizard.copy.completedTitle}
          description={wizard.copy.completedDescription}
          confirmText="확인"
          onConfirm={wizard.close}
          onClose={wizard.close}
        />
      ) : wizard.step === "analyzing" ? (
        <AnalyzingModal
          failureMessage={wizard.analyzingFailureMessage}
          onRetry={wizard.startAnalysis}
          onCancel={wizard.cancelAnalysis}
        />
      ) : wizard.step === "highlight" && wizard.duration !== null ? (
        <HighlightStep
          objectUrl={wizard.objectUrl}
          duration={wizard.duration}
          suggestions={wizard.suggestions}
          manualFallback={wizard.manualFallback}
          onRetryAnalysis={wizard.startAnalysis}
          onNext={wizard.goPreview}
          onClose={wizard.close}
        />
      ) : wizard.step === "preview" && wizard.segment !== null ? (
        <PreviewStep
          trim={wizard.trim}
          segment={wizard.segment}
          locationLabel={wizard.locationLabel}
          confirmLabel={wizard.copy.confirmLabel}
          submittingLabel={wizard.copy.submittingLabel}
          onRetryTrim={wizard.retryTrim}
          onPublish={() => void wizard.publish()}
          submitting={wizard.submitting}
          submitFailureMessage={wizard.submitFailureMessage}
          onBack={wizard.wentThroughHighlight ? wizard.backToHighlight : null}
          onClose={wizard.busy ? undefined : wizard.close}
        />
      ) : (
        <SelectStep
          selectedName={wizard.file?.name ?? null}
          onSelectFile={wizard.handleSelectFile}
          durationTooLong={wizard.durationTooLong}
          selectFailure={wizard.selectFailure}
          videoLoadError={wizard.videoLoadError}
          locationLabel={wizard.locationLabel}
          canProceed={wizard.canProceed}
          onNext={wizard.startAnalysis}
          onClose={wizard.close}
        />
      )}
    </DialogShell>
  );
};
