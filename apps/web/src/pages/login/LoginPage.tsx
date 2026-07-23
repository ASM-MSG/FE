import appIcon from "./assets/fillmap-app-icon.png";
import { KakaoLoginButton } from "./ui/KakaoLoginButton";

/**
 * SOURCE: Figma "소셜 로그인 (웹)" (node 13686:1495) — /login 진입점 (MSG-46).
 * 셸(SideRail·MapShell) 밖 독립 라우트로 등록된다(AC 1). 1440 고정 캔버스 재현이 아니라
 * 전체 높이 + 최대폭 390px 중앙 컬럼의 반응형 구현(스펙 추정 4). 히어로가 남는 높이를
 * 차지해 중앙에 오는 구조는 Figma Body(flex-1 Hero)와 동일하다.
 * 타이틀은 Figma 25px 대신 text-fm-display(20px) 다운스케일 — 사용자 확정(스펙 확정 1).
 */
export const LoginPage = () => (
  <main className="flex min-h-dvh justify-center bg-background">
    <div className="flex w-full max-w-97.5 flex-col items-center gap-md px-lg pt-31.5 pb-xl">
      <header className="flex flex-col items-center gap-xs text-center">
        <h1 className="text-fm-display text-foreground">필맵에 로그인</h1>
        <p className="text-fm-base text-foreground-body">
          빠르고 간편하게 시작하세요
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-lg">
        <div className="flex size-52.5 items-center justify-center rounded-full bg-surface">
          <img src={appIcon} alt="필맵 로고" className="size-26" />
        </div>
        <p className="text-fm-base text-foreground-body">
          기록하고, 모으고, 탐험하는 지도
        </p>
      </div>
      <p className="text-fm-label text-foreground-muted">
        SNS 계정으로 간편하게 시작해요
      </p>
      <KakaoLoginButton />
      {/* 약관·처리방침은 플레인 텍스트 — 링크 연결은 해당 페이지 티켓에서(AC 7, 제외 범위) */}
      <p className="text-center text-fm-caption text-foreground-body">
        로그인 시 서비스 약관과 개인정보 처리 방침에 동의합니다
      </p>
    </div>
  </main>
);
