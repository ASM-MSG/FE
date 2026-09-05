import { ConsoleShell } from "@/widgets/console-shell/ConsoleShell";
import { ADMIN_CONSOLE } from "@/widgets/console-shell/console-config";
import { RequireAdminRole } from "./RequireAdminRole";

/** 관리자 콘솔 보호 레이아웃 (MSG-541) — 가드 통과 후 관리자 설정으로 공통 셸을 세운다 */
export const AdminConsoleLayout = () => (
  <RequireAdminRole>
    <ConsoleShell config={ADMIN_CONSOLE} />
  </RequireAdminRole>
);
