import type { ElementType, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { CONSOLE_ROUTES } from "@/app/console-routes";
// MSG-464: 자산을 투명 배경 416px 알파 PNG로 교체(파일 내용만 갱신 — 렌더 104px의 4배,
// Figma 15166-2928 래스터에서 흰 배경 제거). 소비자가 이 파일 유일이라 이름은 유지한다.
import appIcon from "../assets/fillmap-app-icon.png";
import { useLoginModalStore } from "../model/login-modal-store";
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
 * → 운영자 콘솔 안내 링크(MSG-555) → 개발용 로그인 섹션(dev 빌드 전용, MSG-352).
 * 타이틀은 Figma 25px 대신 text-fm-display(20px) 다운스케일 — MSG-46 확정 유지.
 */
export const LoginContent = ({ titleAs: Title }: LoginContentProps) => {
  // 리프 직접 구독 (MSG-463 RegionPanel 선례) — 링크 이동 전에 전역 모달 플래그를 내린다.
  // 콘솔 라우트는 AppLayout 형제라 모달이 언마운트만 될 뿐 open=true가 남고,
  // 유저 앱으로 복귀하면 유령 모달로 다시 떠 버린다 (MSG-555 AC 2).
  const closeModal = useLoginModalStore((state) => state.closeModal);

  /**
   * 현재 탭이 실제로 콘솔로 떠날 때만 모달을 내린다 (codex 리뷰 P2).
   * Cmd/Ctrl/Shift+클릭은 react-router가 브라우저 기본 동작에 넘겨 새 탭·새 창으로
   * 열고 **현재 탭은 그대로 둔다** — 이때 닫으면 원래 탭의 모달만 사라져 링크의
   * 계약이 깨진다(`Link`를 쓴 이유가 우클릭·새 탭 보존이다).
   */
  const handleConsoleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    closeModal();
  };

  return (
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
      {/*
        운영자 콘솔 진입 링크 (MSG-555 AC 1·2 — Figma 정본 없음, 문구는 스펙 추정 3 승인안).
        `@/app/console-routes`의 문자열 상수만 참조한다 — 콘솔 화면 코드를 import하면
        lazy 청크 전제가 깨진다 (AC 8).
      */}
      <p className="flex flex-wrap items-center justify-center gap-xxs text-center text-fm-caption text-foreground-muted">
        행사 운영자이신가요?
        <Link
          to={CONSOLE_ROUTES.orgLogin}
          onClick={handleConsoleLinkClick}
          className="font-semibold text-primary"
        >
          운영자 콘솔 로그인 →
        </Link>
      </p>
      {/* 개발 모드 전용 로그인 — dev 빌드에서만 렌더, 프로덕션 번들 미노출 (MSG-352 A1·추정 2) */}
      <DevLoginPanel />
    </div>
  );
};
