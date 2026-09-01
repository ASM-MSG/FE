import { ConsoleShell } from "@/widgets/console-shell/ConsoleShell";
import { ORG_CONSOLE } from "@/widgets/console-shell/console-config";
import { RequireOrgRole } from "./RequireOrgRole";

/** 운영자 콘솔 보호 레이아웃 (MSG-541) — 가드 통과 후 운영자 설정으로 공통 셸을 세운다 */
export const OrgConsoleLayout = () => (
  <RequireOrgRole>
    <ConsoleShell config={ORG_CONSOLE} />
  </RequireOrgRole>
);
