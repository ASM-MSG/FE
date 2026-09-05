import { useCallback, useEffect } from "react";
import { useBlocker } from "react-router-dom";
import {
  isSubmissionDirty,
  useSubmissionWizardStore,
} from "@/features/event-submission/model/submission-wizard-store";

const EXIT_CONFIRM_MESSAGE =
  "작성 중인 내용이 사라집니다. 등록을 그만두시겠어요?";

/**
 * 작성 중 이탈 경고 (AC 14, 추정 4) — 뷰-레이어 컴포넌트.
 * 라우터 네비게이션은 `useBlocker`로 잡아 확인을 받고, 새로고침·탭 닫기는 브라우저
 * beforeunload 경고까지만 한다(상태 소실은 수용 — 스토어는 비영속이다).
 * 라우터·window 참조를 이 파일에 격리해 위저드 스토어·모델은 플랫폼 중립으로 남긴다.
 *
 * **차단 판정은 네비게이션 시점의 스토어를 읽는다** (MSG-548 AC 9): prop은 마지막 렌더의
 * 값이라, 제출 성공이 같은 콜백에서 `reset()` → `navigate()`를 잇는 경로에서는 아직
 * dirty=true로 남아 경고가 오발화한다(리셋 리렌더는 navigate 이후에 커밋된다).
 * `dirty` prop은 반응이 필요한 beforeunload 등록·해제가 계속 쓴다.
 */
export const WizardExitGuard = ({ dirty }: { dirty: boolean }) => {
  const shouldBlock = useCallback(
    () => isSubmissionDirty(useSubmissionWizardStore.getState()),
    [],
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(EXIT_CONFIRM_MESSAGE)) {
      blocker.proceed();
      return;
    }
    blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return null;
};
