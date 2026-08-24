import type { ElementType } from "react";
// MSG-464: 자산을 투명 배경 416px 알파 PNG로 교체(파일 내용만 갱신 — 렌더 104px의 4배,
// Figma 15166-2928 래스터에서 흰 배경 제거). 소비자가 이 파일 유일이라 이름은 유지한다.
import appIcon from "../assets/fillmap-app-icon.png";
import { DevLoginPanel } from "./DevLoginPanel";
import { KakaoLoginButton } from "./KakaoLoginButton";

interface LoginContentProps {
  /**
   * 타이틀 렌더러 — LoginModal이 Dialog.Title(asChild h2) 래퍼를 주입해 가시 타이틀이
   * 곧 다이얼로그 접근성 이름이 되게 한다(중복 sr-only 헤딩 방지).
   */
  titleAs: ElementType;
}

/**
 * SOURCE: Figma "소셜 로그인" (node 13729:5021 — 로그인 페이지 프레임 13686:1495와 동일 구조·카피).
 * 로그인 콘텐츠 컬럼의 단일 소스 (MSG-46 후속 2 G2 — 중복 구현 금지). /login 페이지는 G7로
 * 제거되어 현재 유일한 소비자는 LoginModal이다 — 페이지가 부활하면 이 컴포넌트를 다시 조립한다.
 * 구성: 타이틀·서브카피 → 로고 히어로·태그라인 → SNS 안내 → 카카오 버튼 → 약관 문구
 * → 개발용 로그인 섹션(dev 빌드 전용, MSG-352).
 * 타이틀은 Figma 25px 대신 text-fm-display(20px) 다운스케일 — MSG-46 확정 유지.
 */
export const LoginContent = ({ titleAs: Title }: LoginContentProps) => (
  <div className="flex w-full flex-col items-center gap-md">
    <header className="flex flex-col items-center gap-xs text-center">
      <Title className="text-fm-display text-foreground">필맵에 로그인</Title>
      <p className="text-fm-base text-foreground-body">
        빠르고 간편하게 시작하세요
      </p>
    </header>
    <div className="flex flex-col items-center justify-center gap-lg">
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
    {/* 약관·처리방침은 플레인 텍스트 — 링크 연결은 해당 페이지 티켓에서(MSG-46 AC 7, 제외 범위) */}
    <p className="text-center text-fm-caption text-foreground-body">
      로그인 시 서비스 약관과 개인정보 처리 방침에 동의합니다
    </p>
    {/* 개발 모드 전용 로그인 — dev 빌드에서만 렌더, 프로덕션 번들 미노출 (MSG-352 A1·추정 2) */}
    <DevLoginPanel />
  </div>
);
