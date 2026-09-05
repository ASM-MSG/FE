import { useState } from "react";
import type { QueuePillView } from "@/features/admin-accounts/model/account-view";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { AccountPills } from "./accounts/AccountPills";
import { EmailChangeSection } from "./accounts/EmailChangeSection";
import { OperatorAccountsSection } from "./accounts/OperatorAccountsSection";
import { RequestQueueSection } from "./accounts/RequestQueueSection";

const PAGE_TITLE = "계정 운영";
const PAGE_DESCRIPTION =
  "행사 운영자 계정을 발급하고, 기관이 보낸 계정 발급·아이디 변경 요청을 처리합니다.";

/** 페이지 내부 구획 3종 (스펙 질문 1 기본안 — 셸 무접촉) */
type AccountsTab = "OPERATORS" | "REQUESTS" | "EMAIL_CHANGE";

const TAB_VIEWS: QueuePillView<AccountsTab>[] = [
  { value: "OPERATORS", label: "운영자 계정" },
  { value: "REQUESTS", label: "발급 요청" },
  { value: "EMAIL_CHANGE", label: "아이디 변경" },
];

/**
 * 관리자 계정 운영 (MSG-551 — Figma 15525:9064 · 15579:2326).
 * 콘솔 셸(MSG-541)의 본문으로 렌더되므로 셸·가드·라우트는 건드리지 않는다.
 *
 * Figma는 "발급 요청"과 "운영자 계정"을 사이드바로 갈린 별개 화면 2장으로 그렸지만,
 * 구현 사이드바(`ADMIN_CONSOLE.menu`)는 행사 2메뉴 고정이고 라우트도 `/admin/accounts`
 * 하나다 — **세 구획을 페이지 내부 탭으로 담는다**(스펙 질문 1 기본안). 사이드바 활성
 * 강조 공백은 MSG-541의 알려진 구조다.
 *
 * 문서 제목은 탭과 무관하게 "계정 운영"이고(AC 8), h1도 그 값이다 — 탭에 따라 h1이
 * 바뀌면 콘솔 라우팅 스모크의 화면 동일성 단정이 탭 상태에 딸려간다. Figma 화면별 제목은
 * 각 구획의 h2로 들어간다.
 *
 * 탭별로 구획을 언마운트해 **비활성 탭의 쿼리는 진입 전까지 발사되지 않는다**
 * (스펙 추정 7 — 상단 탭에 counts 뱃지를 달지 않는 이유이기도 하다).
 */
export const AdminAccountsPage = () => {
  useDocumentTitle(formatDocumentTitle(PAGE_TITLE));
  const [tab, setTab] = useState<AccountsTab>("OPERATORS");

  return (
    <div className="flex min-h-full flex-col gap-lg">
      <header className="flex flex-col gap-2.5">
        <h1 className="text-fm-display text-foreground">{PAGE_TITLE}</h1>
        <p className="text-fm-label text-foreground-muted">
          {PAGE_DESCRIPTION}
        </p>
      </header>

      <AccountPills
        label="계정 운영 구획"
        views={TAB_VIEWS}
        active={tab}
        onSelect={setTab}
      />

      {tab === "OPERATORS" ? (
        <OperatorAccountsSection />
      ) : tab === "REQUESTS" ? (
        <RequestQueueSection />
      ) : (
        <EmailChangeSection />
      )}
    </div>
  );
};
