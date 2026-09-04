import { useEffect, useState } from "react";
import { RetryNotice, Skeleton, Toast } from "@fillmap/ui-web";
import { useOrgProfileQuery } from "@/features/org-account/api/use-org-profile-query";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { SettingsContactForm } from "./ui/SettingsContactForm";
import { SettingsEmailChangeDialog } from "./ui/SettingsEmailChangeDialog";
import { SettingsLoginCard } from "./ui/SettingsLoginCard";
import { SettingsPasswordChangeView } from "./ui/SettingsPasswordChangeView";

/**
 * 계정 설정 (MSG-544) — SOURCE: Figma 계정 설정 15651:2974 · 비밀번호 변경 15649:2967.
 *
 * 비밀번호 변경은 **라우트가 아니라 내부 뷰 전환**이다(웨이브 2 규칙 — `router.tsx` 무수정,
 * 542 재설정 3모드 선례): `/org/settings` URL은 그대로다.
 *
 * 조회는 545가 남긴 `useOrgProfileQuery`를 그대로 재사용하고(사이드바와 캐시 공유),
 * 저장·요청 로직은 `features/org-account`·`features/auth`가 소유한다 — 이 파일은 뷰 전환·
 * 로딩/실패 게이트·완료 안내만 조립한다.
 */

/** 완료 안내가 스스로 사라지는 시간 — 자동 소멸형 일시 안내(추정 7) */
const NOTICE_DURATION_MS = 5_000;

export const OrgSettingsPage = () => {
  useDocumentTitle(formatDocumentTitle("계정 설정"));
  const [mode, setMode] = useState<"settings" | "password">("settings");
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  // 승인 대기 안내는 세션 로컬이다 — org 쪽 대기 요청 조회 API가 없다(스펙 질문 2 승인)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { data: profile, isPending, isError, refetch } = useOrgProfileQuery();

  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  if (mode === "password") {
    return (
      <SettingsPasswordChangeView
        onBack={() => setMode("settings")}
        onChanged={() => {
          setMode("settings");
          setNotice("비밀번호를 변경했습니다");
        }}
      />
    );
  }

  return (
    <div className="flex w-full max-w-150 flex-col gap-lg">
      <header className="flex flex-col gap-xxs">
        <h1 className="text-fm-display text-foreground">계정 설정</h1>
        <p className="text-fm-body text-foreground-muted">
          로그인 정보와 담당자 정보를 관리합니다.
        </p>
      </header>

      {notice !== null && <Toast variant="light" title={notice} />}

      {isError ? (
        <RetryNotice
          message="계정 정보를 불러오지 못했어요"
          onRetry={() => void refetch()}
        />
      ) : isPending || profile === undefined ? (
        <>
          <Skeleton className="h-84 w-full rounded-md" />
          <Skeleton className="h-52 w-full rounded-md" />
        </>
      ) : (
        <>
          <SettingsLoginCard
            email={profile.email}
            pendingEmail={pendingEmail}
            onRequestEmailChange={() => setIsEmailDialogOpen(true)}
            onChangePassword={() => setMode("password")}
          />
          <SettingsContactForm
            contactName={profile.contactName}
            contactPhone={profile.contactPhone}
            onSaved={() => setNotice("담당자 정보를 저장했습니다")}
          />
          <p className="text-fm-caption text-foreground-muted">
            계정 관련 문의는 운영팀 support@fillmap.kr 으로 보내주세요.
          </p>
        </>
      )}

      {isEmailDialogOpen && (
        <SettingsEmailChangeDialog
          onClose={() => setIsEmailDialogOpen(false)}
          onRequested={(requestedEmail) => {
            setPendingEmail(requestedEmail);
            setIsEmailDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};
