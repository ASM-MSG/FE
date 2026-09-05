import { LogOut, MapPin } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SideRail } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useLogout } from "@/features/auth/api/use-auth-mutations";
import type { ConsoleConfig } from "./console-config";
import { activeConsoleNavKey } from "./console-nav";
import { ConsoleSidebar } from "./ConsoleSidebar";

/**
 * 콘솔 공통 셸 (MSG-541 AC 4·5) — 72px 아이콘 레일(ui-web `SideRail` 재사용 + 하단
 * 로그아웃 슬롯) + 280px 사이드바 + 본문(Outlet).
 *
 * 운영자·관리자 변형은 **설정 객체 2벌**(console-config)로 표현한다 — 컴포넌트 분기가 아니다.
 * MapShell·AppLayout 밖 최상위 레이아웃이라 사이드레일 내비·로그인 모달·위치동의 게이트가
 * 여기에 나타나지 않는다 (AC 11).
 *
 * 로그아웃 배선은 셸이 소유한다: `useLogout`(features/auth 재사용) → 성공·실패 무관
 * (onSettled) 로컬 세션 종료 후 콘솔 로그인으로 이동한다.
 * 조립 전용 뷰-레이어 컴포넌트라 라우터를 직접 참조한다 (RN 재사용 대상 아님).
 */
export const ConsoleShell = ({ config }: { config: ConsoleConfig }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { mutate: logout } = useLogout({
    onFinished: () => navigate(CONSOLE_ROUTES.orgLogin, { replace: true }),
  });

  return (
    <div className="flex h-dvh bg-surface-soft">
      <SideRail
        aria-label={config.railLabel}
        logo={
          <span className="flex size-full items-center justify-center bg-primary text-primary-foreground">
            <MapPin className="size-5" />
          </span>
        }
        items={config.rail}
        activeKey={activeConsoleNavKey(pathname, config.rail)}
        onSelect={(key) => {
          const target = config.rail.find((item) => item.key === key);
          if (target !== undefined) navigate(target.path);
        }}
        footer={
          <button
            type="button"
            onClick={() => logout()}
            className="flex size-14 flex-col items-center justify-center gap-xxs rounded-md text-foreground-body transition-colors active:bg-surface"
          >
            <span className="flex size-5.5 items-center justify-center">
              <LogOut className="size-full" />
            </span>
            <span className="text-fm-caption font-medium">로그아웃</span>
          </button>
        }
      />
      <ConsoleSidebar
        title={config.title}
        items={config.menu}
        activeKey={activeConsoleNavKey(pathname, config.menu)}
        onSelect={(path) => navigate(path)}
        header={config.sidebarHeader}
        footer={config.sidebarFooter}
      />
      <main className="flex flex-1 flex-col overflow-y-auto p-10">
        <Outlet />
      </main>
    </div>
  );
};
