import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

const EXIT_CONFIRM_MESSAGE =
  "작성 중인 내용이 사라집니다. 등록을 그만두시겠어요?";

/**
 * 작성 중 이탈 경고 (AC 14, 추정 4) — 뷰-레이어 컴포넌트.
 * 라우터 네비게이션은 `useBlocker`로 잡아 확인을 받고, 새로고침·탭 닫기는 브라우저
 * beforeunload 경고까지만 한다(상태 소실은 수용 — 스토어는 비영속이다).
 * 라우터·window 참조를 이 파일에 격리해 위저드 스토어·모델은 플랫폼 중립으로 남긴다.
 */
export const WizardExitGuard = ({ dirty }: { dirty: boolean }) => {
  const blocker = useBlocker(dirty);

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
