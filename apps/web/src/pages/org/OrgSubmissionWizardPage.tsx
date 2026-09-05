import { useLayoutEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, RetryNotice } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import {
  isSubmissionDirty,
  submissionWizardMode,
  useSubmissionWizardStore,
} from "@/features/event-submission/model/submission-wizard-store";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { revokeBlobPreviewUrl } from "./ui/preview-url";
import { RejectionNoticeBanner } from "./ui/RejectionNoticeBanner";
import { SubmissionLoadingSkeleton } from "./ui/SubmissionLoadingSkeleton";
import { useSubmissionEditEntry } from "./ui/use-submission-edit-entry";
import { WizardExitGuard } from "./ui/WizardExitGuard";
import { WizardProgress } from "./ui/WizardProgress";
import { WizardStepSwitch } from "./ui/WizardStepSwitch";

/**
 * 행사 등록 위저드 (MSG-546) — `/org/submissions/new`.
 * 스텝은 위저드 내부 상태이고(MSG-541 추정 5) 라우트는 하나다. 본문 분기의 정본은
 * `ui/WizardStepSwitch` 한 파일이며, 입력·스텝은 `features/event-submission` 스토어가
 * 소유한다(AC 12).
 *
 * 반려 재신청 수정 모드(`/org/submissions/:submissionId/edit`, MSG-550)도 이 페이지가
 * 렌더한다 — 스텝 구성은 그대로이고, 진입 훅(`use-submission-edit-entry`)이 신청 상세로
 * 스토어를 프리필하며 상단에 반려 사유 배너가 붙는다. 유형 선택 복귀는 진행 표시에서
 * 잠근다(서버가 유형 변경을 허용하지 않는다 — AC 2).
 *
 * 마운트마다 스토어를 초기화한다(AC 14, 추정 4) — 비영속이라 재진입은 항상 빈 위저드다.
 * **초기화는 layout effect다**: 수정 모드 프리필(진입 훅의 passive effect)보다 반드시
 * 먼저 실행돼야 프리필이 지워지지 않는다(MSG-550 — 상세가 캐시에 있어 첫 렌더에 도착하는
 * 동선에서 실제로 부딪히는 순서다). 경로 파라미터가 바뀌면 다시 초기화한다 —
 * `/new`↔`/edit` 전이에서 재마운트가 보장되지 않아 이전 진입의 값이 남을 수 있다.
 *
 * 페이지 제목은 스크린리더 전용 h1이다: 화면 제목은 스텝별 h2(시안)라 문서 개요상
 * 라우트 제목이 h1으로 남아야 한다(탭 제목과도 같은 문구).
 */
/** 수정 모드에서 되돌아갈 수 없는 스텝 — 유형은 서버가 변경을 허용하지 않는다 (AC 2) */
const EDIT_LOCKED_STEPS = ["type"] as const;

export const OrgSubmissionWizardPage = () => {
  const entry = useSubmissionEditEntry();
  const title = entry.isEditRoute ? "수정 후 재제출" : "새 행사 등록";
  useDocumentTitle(formatDocumentTitle(title));
  const navigate = useNavigate();
  const step = useSubmissionWizardStore((state) => state.step);
  const goToStep = useSubmissionWizardStore((state) => state.goToStep);
  const reset = useSubmissionWizardStore((state) => state.reset);
  const editContext = useSubmissionWizardStore((state) => state.editContext);
  const mode = useSubmissionWizardStore(submissionWizardMode);
  const dirty = useSubmissionWizardStore(isSubmissionDirty);

  useLayoutEffect(() => {
    reset();
    // 이탈 시 blob 해제 → 스토어 리셋 (codex 리뷰 P2 ×2) — 언마운트에서 리셋해야
    // 재진입 첫 프레임에 이전 스텝·값이 잠깐 렌더되지 않는다.
    // 해제가 리셋보다 먼저여야 previewUrl이 지워지기 전에 blob을 놓아준다
    // (서버 이미지 URL(https:)은 `revokeBlobPreviewUrl`이 건드리지 않는다 — MSG-550).
    return () => {
      revokeBlobPreviewUrl(
        useSubmissionWizardStore.getState().image.previewUrl,
      );
      reset();
    };
  }, [reset, entry.routeParam]);

  // 위치 영역 스텝은 지도 전면이다 (MSG-547 추정 2·5): 셸 본문 패딩(p-10)을 음수 마진으로
  // 상쇄해 패널+지도가 본문을 꽉 채우고, 등록 절차 카드는 렌더하지 않는다(시안 부재 +
  // 지도 전면과 양립 불가 — 복귀 동선은 패널의 "‹ 기본 정보"가 담당). 셸(console-shell)은
  // 건드리지 않는다.
  const isAreaStep = step === "area";
  const isEditMode = mode === "edit";

  if (entry.redirectTo !== null) {
    return <Navigate to={entry.redirectTo} replace />;
  }

  return (
    <div
      className={
        isAreaStep
          ? "-m-10 flex min-h-0 flex-1 flex-col"
          : "flex flex-1 flex-col gap-xl"
      }
    >
      <h1 className="sr-only">{title}</h1>
      {entry.isInvalidId ? (
        // 재시도할 요청이 없는 실패라 RetryNotice가 아니라 목록 복귀 안내다 (MSG-549 선례)
        <div className="flex items-center justify-between gap-sm py-xs">
          <p className="text-fm-body text-foreground-muted">
            잘못된 신청 번호로 들어왔어요
          </p>
          <Button
            text="목록으로 돌아가기"
            variant="secondary"
            size="sm"
            onClick={() => navigate(CONSOLE_ROUTES.orgSubmissions)}
          />
        </div>
      ) : entry.isError ? (
        <RetryNotice
          message="신청 상세를 불러오지 못했어요"
          onRetry={entry.retry}
        />
      ) : entry.isPending ? (
        <SubmissionLoadingSkeleton label="신청 내용을 불러오는 중" />
      ) : (
        <>
          {isEditMode && !isAreaStep && editContext !== null && (
            <RejectionNoticeBanner
              rejection={editContext.rejection}
              droppedLocations={editContext.droppedLocations}
            />
          )}
          <WizardStepSwitch step={step} />
          {!isAreaStep && (
            <div className="mt-auto pt-xl">
              <WizardProgress
                current={step}
                onSelect={goToStep}
                lockedSteps={isEditMode ? EDIT_LOCKED_STEPS : undefined}
              />
            </div>
          )}
        </>
      )}
      <WizardExitGuard dirty={dirty} />
    </div>
  );
};
