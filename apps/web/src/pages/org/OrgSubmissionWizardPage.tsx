import { ConsoleStub } from "@/widgets/console-shell/ConsoleStub";

/**
 * 행사 등록 위저드 (MSG-546·547·548) — 스텝은 위저드 내부 상태다(추정 5).
 * 반려 재신청 수정 모드(`/org/submissions/:submissionId/edit`, MSG-550)도 이 페이지를 쓴다.
 * 이 티켓(MSG-541)은 라우트 골격만 세운다 — 자리표시 제목 하나다.
 */
export const OrgSubmissionWizardPage = () => (
  <ConsoleStub title="새 행사 등록" />
);
