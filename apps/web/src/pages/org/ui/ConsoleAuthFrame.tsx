import type { ReactNode } from "react";

/**
 * 공개 콘솔 인증 화면의 공통 골격 (MSG-542 — Figma 15525:8633·15650:2971·15650:3001 공통 헤더).
 *
 * FILLMAP 워드마크 + 부제 헤더 아래 400px 센터 칼럼을 세운다. 이 골격을 쓰는 화면
 * (로그인·재설정 요청·발송 완료)은 전부 콘솔 셸 **밖** 공개 라우트라 전면 레이아웃이다 —
 * 셸 안에 렌더되는 `/org/password/setup`은 이 프레임을 쓰지 않는다(본문 센터 정렬).
 */
export const ConsoleAuthFrame = ({
  subtitle,
  children,
}: {
  subtitle: string;
  children: ReactNode;
}) => (
  <div className="flex min-h-dvh flex-col items-center bg-surface-soft px-md py-30">
    <header className="flex flex-col items-center gap-md">
      <span className="text-fm-display font-bold text-primary">FILLMAP</span>
      <p className="text-fm-caption font-semibold text-foreground-muted">
        {subtitle}
      </p>
    </header>
    <div className="mt-xl flex w-full max-w-100 flex-col">{children}</div>
  </div>
);
