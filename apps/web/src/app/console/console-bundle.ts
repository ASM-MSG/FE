/**
 * 콘솔 청크 단일 진입점 (MSG-541 AC 3) — router.tsx의 콘솔 라우트 전부가 이 한 모듈을
 * dynamic import한다. 16경로가 같은 모듈을 가리키므로 콘솔 코드는 **하나의 청크**로 묶이고
 * (진입 시 요청 1회), 유저 앱(`/`) 진입 시에는 어떤 콘솔 코드도 로드되지 않는다.
 *
 * 경로 상수(app/console-routes.ts)만 유저 번들에 남는다 — 문자열이라 무해하다.
 * 보안선은 서버 role 인가이고 청크 분리는 노출 억제일 뿐이다(티켓 확정).
 */
export { AdminConsoleLayout } from "./AdminConsoleLayout";
export { ConsoleRoot } from "./ConsoleRoot";
export { OrgConsoleLayout } from "./OrgConsoleLayout";

export { AdminAccountsPage } from "@/pages/admin/AdminAccountsPage";
export { AdminEventsPage } from "@/pages/admin/AdminEventsPage";
export { AdminReviewDetailPage } from "@/pages/admin/AdminReviewDetailPage";
export { AdminReviewQueuePage } from "@/pages/admin/AdminReviewQueuePage";
export { OrgAccountRequestPage } from "@/pages/org/OrgAccountRequestPage";
export { OrgGuidePage } from "@/pages/org/OrgGuidePage";
export { OrgHomePage } from "@/pages/org/OrgHomePage";
export { OrgLoginPage } from "@/pages/org/OrgLoginPage";
export { OrgPasswordResetPage } from "@/pages/org/OrgPasswordResetPage";
export { OrgPasswordSetupPage } from "@/pages/org/OrgPasswordSetupPage";
export { OrgSettingsPage } from "@/pages/org/OrgSettingsPage";
export { OrgSubmissionDetailPage } from "@/pages/org/OrgSubmissionDetailPage";
export { OrgSubmissionsPage } from "@/pages/org/OrgSubmissionsPage";
export { OrgSubmissionWizardPage } from "@/pages/org/OrgSubmissionWizardPage";
