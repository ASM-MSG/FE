import { type FormEvent, useState } from "react";
import { Button, Input } from "@fillmap/ui-web";
import { useIssueAccount } from "@/features/admin-accounts/api/use-issue-account";
import {
  canSubmitIssue,
  issueFormHints,
  issuedNotice,
  type IssueFormValues,
  normalizeIssueForm,
} from "@/features/admin-accounts/model/account-view";

const EMPTY_FORM: IssueFormValues = {
  orgName: "",
  contactName: "",
  email: "",
};

/** Figma 15525:9064 "초기 비밀번호 전달" 행 — 버튼 없이 안내만 (스펙 추정 3) */
const PASSWORD_DELIVERY_NOTICE =
  "공식 이메일로 자동 발송 · 첫 로그인 시 24시간 내 변경이 강제됩니다.";

/** Figma 15525:9064 안내 박스 — 셀프 요청은 다른 구획에서 처리한다 */
const REQUEST_TAB_NOTICE =
  "기관이 보낸 계정 발급 요청은 '발급 요청' 탭에서 확인·처리합니다.";

const FIELDS = [
  {
    key: "orgName",
    label: "기관명",
    placeholder: "부산진구청",
    autoComplete: "organization",
    type: "text",
  },
  {
    key: "contactName",
    label: "담당자",
    placeholder: "김담당",
    autoComplete: "name",
    type: "text",
  },
  {
    key: "email",
    label: "공식 이메일",
    placeholder: "name@organization.go.kr",
    autoComplete: "email",
    type: "email",
  },
] as const;

/**
 * 새 계정 발급 폼 (MSG-551 AC 1·4·8·9 — Figma 15525:9064 좌측 카드).
 *
 * 인풋은 3종뿐이다 — 연락처는 티켓·Figma·서버 선택 필드 모두와 정합해 미구현
 * (스펙 추정 5). **초기 비밀번호는 서버 응답에 없으므로 이 폼이 렌더할 재료 자체가
 * 없다** — 발송 성공 여부만 안내한다 (AC 8).
 *
 * 항목별 안내는 첫 제출 시도 후부터 보인다 — 타이핑 도중 빨간 문구가 따라다니지 않게.
 * 판정·문구는 `account-view`(순수)가 소유한다.
 */
export const IssueAccountForm = () => {
  const [form, setForm] = useState<IssueFormValues>(EMPTY_FORM);
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const issue = useIssueAccount({
    onIssued: (result) => {
      // 폼을 비워 다음 기관을 바로 받는다 — 값이 남으면 같은 이메일로 재발급을 눌러 1409가 난다
      setForm(EMPTY_FORM);
      setAttempted(false);
      setFailure(null);
      setNotice(issuedNotice(result.emailSent));
    },
    onFailed: (failureNotice) => {
      setNotice(null);
      setFailure(failureNotice.message);
    },
  });

  const hints = issueFormHints(form);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (!canSubmitIssue(form)) return;
    setNotice(null);
    setFailure(null);
    // 판정이 trim한 값을 봤으므로 전송도 정규화한 값이어야 한다 — 원문을 보내면
    // UI가 통과시킨 이메일을 서버가 거절하거나 공백이 그대로 저장된다 (codex P2)
    issue.mutate(normalizeIssueForm(form));
  };

  return (
    <section className="flex w-95 shrink-0 flex-col gap-md rounded-md bg-background p-lg shadow-raised">
      <h3 className="text-fm-title text-foreground">새 계정</h3>

      {/* noValidate: 형식 안내는 브라우저 기본 툴팁이 아니라 폼 안 문구로 낸다 (ResetRequestForm 선례) */}
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-md">
        {FIELDS.map((field) => {
          const hint = attempted ? hints[field.key] : null;
          return (
            <label key={field.key} className="flex flex-col gap-xs">
              <span className="text-fm-label text-foreground-body">
                {field.label}
              </span>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                value={form[field.key]}
                error={hint !== null}
                className="ring-1 ring-border"
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    [field.key]: event.target.value,
                  }))
                }
              />
              {hint !== null && (
                <span className="text-fm-caption text-error">{hint}</span>
              )}
            </label>
          );
        })}

        {/* 라벨→값 한 쌍이라 정의 목록이 맞다 — 스크린리더가 "초기 비밀번호 전달: …"로 묶어 읽는다 */}
        <dl className="flex flex-col gap-xxs rounded-sm bg-surface-soft p-sm">
          <dt className="text-fm-label text-foreground">초기 비밀번호 전달</dt>
          <dd className="text-fm-caption text-foreground-muted">
            {PASSWORD_DELIVERY_NOTICE}
          </dd>
        </dl>

        <p className="rounded-sm bg-surface p-sm text-fm-caption text-foreground-body">
          {REQUEST_TAB_NOTICE}
        </p>

        <Button
          type="submit"
          text="행사 운영자 계정 발급"
          className="w-full"
          disabled={issue.isPending}
        />
      </form>

      {notice !== null && (
        <p role="status" className="text-fm-caption text-foreground-body">
          {notice}
        </p>
      )}
      {failure !== null && (
        <p role="alert" className="text-fm-caption text-error">
          {failure}
        </p>
      )}
    </section>
  );
};
