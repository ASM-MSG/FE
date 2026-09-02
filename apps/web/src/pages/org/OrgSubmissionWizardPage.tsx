import { useEffect } from "react";
import {
  isSubmissionDirty,
  useSubmissionWizardStore,
} from "@/features/event-submission/model/submission-wizard-store";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { revokeBlobPreviewUrl } from "./ui/preview-url";
import { WizardExitGuard } from "./ui/WizardExitGuard";
import { WizardProgress } from "./ui/WizardProgress";
import { WizardStepSwitch } from "./ui/WizardStepSwitch";

/**
 * 행사 등록 위저드 (MSG-546) — `/org/submissions/new`.
 * 스텝은 위저드 내부 상태이고(MSG-541 추정 5) 라우트는 하나다. 본문 분기의 정본은
 * `ui/WizardStepSwitch` 한 파일이며, 입력·스텝은 `features/event-submission` 스토어가
 * 소유한다(AC 12).
 *
 * 반려 재신청 수정 모드(`/org/submissions/:submissionId/edit`, MSG-550)도 이 페이지를
 * 계속 렌더한다 — 현재는 신규 작성과 같은 화면이며, 수정 모드 동작(신청 상세로 초기값
 * 채우기 + PATCH 제출)은 그 티켓이 스토어 mode 슬롯에 얹는다.
 *
 * 마운트마다 스토어를 초기화한다(AC 14, 추정 4) — 비영속이라 재진입은 항상 빈 위저드다.
 * 페이지 제목은 스크린리더 전용 h1이다: 화면 제목은 스텝별 h2(시안)라 문서 개요상
 * 라우트 제목이 h1으로 남아야 한다(탭 제목과도 같은 문구).
 */
export const OrgSubmissionWizardPage = () => {
  useDocumentTitle(formatDocumentTitle("새 행사 등록"));
  const step = useSubmissionWizardStore((state) => state.step);
  const goToStep = useSubmissionWizardStore((state) => state.goToStep);
  const reset = useSubmissionWizardStore((state) => state.reset);
  const dirty = useSubmissionWizardStore(isSubmissionDirty);

  useEffect(() => {
    reset();
    // 이탈 시 미리보기 blob 해제 — 비영속 스토어라 재진입은 항상 리셋이므로(추정 4)
    // 남겨둘 이유가 없다 (codex 리뷰 P2)
    return () => {
      revokeBlobPreviewUrl(
        useSubmissionWizardStore.getState().image.previewUrl,
      );
    };
  }, [reset]);

  return (
    <div className="flex flex-1 flex-col gap-xl">
      <h1 className="sr-only">새 행사 등록</h1>
      <WizardStepSwitch step={step} />
      <div className="mt-auto pt-xl">
        <WizardProgress current={step} onSelect={goToStep} />
      </div>
      <WizardExitGuard dirty={dirty} />
    </div>
  );
};
