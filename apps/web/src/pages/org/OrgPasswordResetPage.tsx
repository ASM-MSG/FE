import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { ConsoleAuthFrame } from "./ui/ConsoleAuthFrame";
import { ResetConfirmForm } from "./ui/ResetConfirmForm";
import { ResetRequestForm } from "./ui/ResetRequestForm";
import { ResetSentPanel } from "./ui/ResetSentPanel";

/**
 * 비밀번호 재설정 (MSG-542 AC 9·10·11·12) — 공개 라우트, 세 모드가 한 경로를 공유한다:
 *
 * 1. `?token` 없음 → 요청 폼 (Figma 15650:2971)
 * 2. 요청 성공 → 발송 완료 (Figma 15650:3001) — **같은 라우트 안의 상태 전환**
 * 3. `?token=...` → 새 비밀번호 입력 (재설정 메일 링크 진입)
 *
 * 라우트를 신설하지 않는 이유는 웨이브 규칙(router.tsx·console-routes.ts 불가침)이다 —
 * 메일 링크 형식은 `/org/password/reset?token={token}`을 FE 기준으로 삼고 BE에 환류한다.
 */
export const OrgPasswordResetPage = () => {
  useDocumentTitle(formatDocumentTitle("비밀번호 재설정"));
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [requested, setRequested] = useState<{
    email: string;
    sentAt: Date;
  } | null>(null);

  return (
    <ConsoleAuthFrame subtitle="행사 운영자 계정">
      {token !== "" ? (
        <ResetConfirmForm token={token} />
      ) : requested === null ? (
        <ResetRequestForm
          onSent={(email) => setRequested({ email, sentAt: new Date() })}
        />
      ) : (
        <ResetSentPanel
          email={requested.email}
          sentAt={requested.sentAt}
          onResent={() =>
            setRequested({ email: requested.email, sentAt: new Date() })
          }
        />
      )}
    </ConsoleAuthFrame>
  );
};
