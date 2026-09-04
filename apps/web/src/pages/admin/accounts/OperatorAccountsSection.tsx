import { IssuedAccountsCard } from "./IssuedAccountsCard";
import { IssueAccountForm } from "./IssueAccountForm";

/** Figma 15525:9064 헤더 문구 */
const TITLE = "행사 운영자 계정 발급";
const DESCRIPTION =
  "공문·오프라인 문의가 완료된 기관에 LOCAL 로그인 계정을 발급합니다.";

/**
 * 운영자 계정 구획 (MSG-551 AC 8 — Figma 15525:9064).
 * 좌측 발급 폼 + 우측 발급 계정 목록. 두 카드가 각자 자기 쿼리·뮤테이션을 소유해
 * 이 구획은 헤더와 배치만 갖는다.
 */
export const OperatorAccountsSection = () => (
  <div className="flex flex-col gap-lg">
    <header className="flex flex-col gap-xxs">
      <h2 className="text-fm-heading text-foreground">{TITLE}</h2>
      <p className="text-fm-body text-foreground-muted">{DESCRIPTION}</p>
    </header>

    <div className="flex flex-1 items-start gap-lg">
      <IssueAccountForm />
      <IssuedAccountsCard />
    </div>
  </div>
);
