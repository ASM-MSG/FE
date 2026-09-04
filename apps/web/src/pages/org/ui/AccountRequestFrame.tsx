import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { AuthInfoCard } from "./AuthInfoCard";
import { AccountRequestSteps } from "./AccountRequestSteps";

/**
 * SOURCE: Figma 15525:9198(폼)·15525:9253(완료) 공통 골격 (MSG-543 AC 1·5) —
 * 좌측 440px 화이트 패널(워드마크·헤드라인·절차 스텝·안내 카드) + 우측 본문의 분할 레이아웃.
 *
 * `ConsoleAuthFrame`(MSG-542, 400px 센터 칼럼)은 쓰지 않는다: 두 Figma 노드가 로그인·재설정
 * 화면과 다른 분할 레이아웃이고, 그 차이가 디자인 의도다(스펙 리스크 "Figma 오탐 방지").
 *
 * 폼과 완료 화면은 좌측 헤드라인·안내 문구·활성 스텝만 달라 이 골격을 공유한다.
 * 좁은 화면에서는 좌측 패널을 접는다 — 절차 안내는 진행에 필수가 아니고, 폼 입력이 우선이다.
 */
export const AccountRequestFrame = ({
  headline,
  description,
  currentStep,
  children,
}: {
  /** 좌측 헤드라인 — 줄바꿈은 Figma 두 줄 구성 그대로 (`\n`) */
  headline: string;
  description: string;
  currentStep: 1 | 2;
  children: ReactNode;
}) => (
  <div className="flex min-h-dvh bg-surface-soft">
    <aside className="hidden w-110 shrink-0 flex-col border-r border-border bg-surface-elevated px-14 py-13 lg:flex">
      <span className="text-fm-display font-bold text-primary">FILLMAP</span>
      <p className="mt-xs text-fm-caption text-foreground-muted">
        행사 운영자 계정
      </p>
      {/* 헤딩이 아니라 p — 본문 h1보다 먼저 렌더되는 위치라 h2를 주면 헤딩
          아웃라인이 h2→h1로 뒤집힌다 (ConsoleAuthFrame 부제와 같은 처리) */}
      <p className="mt-xxl whitespace-pre-line text-fm-display text-foreground">
        {headline}
      </p>
      <p className="mt-md text-fm-body text-foreground-body">{description}</p>
      <div className="mt-xxl">
        <AccountRequestSteps currentStep={currentStep} />
      </div>
      <div className="mt-auto">
        <AuthInfoCard
          tone="outlined"
          title="계정 발급 안내"
          lines={[
            "담당자 확인 후 발급",
            "개인 이메일보다 기관 공식 이메일을 사용해 주세요.",
          ]}
        />
      </div>
    </aside>
    <div className="min-w-0 flex-1 px-lg py-11 lg:px-18">
      <div className="mx-auto flex w-full max-w-190 flex-col">
        <Link
          to={CONSOLE_ROUTES.orgLogin}
          className="self-start text-fm-caption font-semibold text-primary"
        >
          ‹ 행사 운영자 로그인
        </Link>
        {children}
      </div>
    </div>
  </div>
);
