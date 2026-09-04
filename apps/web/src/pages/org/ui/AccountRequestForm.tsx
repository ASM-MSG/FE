import { type FormEvent, useState } from "react";
import { Button, Input, Selector, cn } from "@fillmap/ui-web";
import type { OrgAccountRequestCreateRequestDto } from "@/shared/api/generated/types.gen";
import {
  type AccountRequestDraft,
  type AccountRequestErrors,
  toAccountRequestBody,
  validateAccountRequest,
} from "../account-request-form";

/**
 * SOURCE: Figma "[v2] [행사 운영자 1-1] 계정 발급 요청" (15525:9198) 폼 카드 —
 * 기관 정보 4필드(2열) + 행사 및 요청 정보(행사명 + 요청 내용) + 동의 + 제출 (MSG-543 AC 1·2·3·4).
 *
 * 입력값은 이 컴포넌트가 보유하고, 유효할 때만 DTO 6필드를 `onSubmit`으로 올린다 —
 * 페이지는 mutation과 화면 전환만 안다. 브라우저 기본 검증(`noValidate`로 차단)은 자체
 * 안내를 가로막으므로 쓰지 않는다(MSG-542에서 검거된 실결함).
 *
 * placeholder 문구는 Figma가 지정한 입력 예시다 — 값 하드코딩이 아니다(스펙 오탐 방지).
 * 요청 내용은 ui-web에 Textarea가 없어 Input 토큰을 준용한 로컬 textarea다
 * (`BasicInfoStep`·`RouteInputCard` 선례). 동의 체크는 ui-web `Selector`를 재사용한다.
 */

const INITIAL_DRAFT: AccountRequestDraft = {
  orgName: "",
  contactName: "",
  contactPhone: "",
  email: "",
  eventName: "",
  content: "",
  consented: false,
};

const CONTENT_ID = "account-request-content";
const CONSENT_ID = "account-request-consent";

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message === undefined ? null : (
    <p id={id} className="text-fm-caption text-error">
      {message}
    </p>
  );

const TextField = ({
  id,
  label,
  placeholder,
  value,
  error,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  type?: "text" | "email" | "tel";
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-col gap-xxs">
    <label htmlFor={id} className="text-fm-label text-foreground-muted">
      {label}
    </label>
    <Input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      error={error !== undefined}
      aria-describedby={error !== undefined ? `${id}-error` : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
    <FieldError id={`${id}-error`} message={error} />
  </div>
);

export const AccountRequestForm = ({
  isPending,
  submitError,
  onSubmit,
}: {
  isPending: boolean;
  /** 제출 실패 안내 — 입력값은 그대로 남아 재제출할 수 있다 (AC 4) */
  submitError: string | null;
  onSubmit: (body: OrgAccountRequestCreateRequestDto) => void;
}) => {
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [errors, setErrors] = useState<AccountRequestErrors>({});

  const update = <Field extends keyof AccountRequestDraft>(
    field: Field,
    value: AccountRequestDraft[Field],
  ) => setDraft((previous) => ({ ...previous, [field]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { errors: found, isValid } = validateAccountRequest(draft);
    setErrors(found);
    // 선검증에서 걸리면 요청을 내보내지 않는다 (AC 2)
    if (!isValid) return;
    onSubmit(toAccountRequestBody(draft));
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="mt-lg flex flex-col gap-lg rounded-sm border border-border bg-surface-elevated p-xl"
    >
      <section className="flex flex-col gap-md">
        <div className="flex items-baseline justify-between">
          <h2 className="text-fm-title text-foreground">기관 정보</h2>
          <span className="text-fm-caption text-primary">필수</span>
        </div>
        <div className="grid gap-md sm:grid-cols-2">
          <TextField
            id="account-request-org-name"
            label="기관명"
            placeholder="예: 부산광역시 관광마이스과"
            value={draft.orgName}
            error={errors.orgName}
            onChange={(value) => update("orgName", value)}
          />
          <TextField
            id="account-request-contact-name"
            label="담당자명"
            placeholder="예: 홍길동"
            value={draft.contactName}
            error={errors.contactName}
            onChange={(value) => update("contactName", value)}
          />
          <TextField
            id="account-request-contact-phone"
            label="연락처"
            type="tel"
            placeholder="010-0000-0000"
            value={draft.contactPhone}
            error={errors.contactPhone}
            onChange={(value) => update("contactPhone", value)}
          />
          <TextField
            id="account-request-email"
            label="공식 이메일"
            type="email"
            placeholder="name@organization.go.kr"
            value={draft.email}
            error={errors.email}
            onChange={(value) => update("email", value)}
          />
        </div>
      </section>

      <div className="h-px bg-border" />

      <section className="flex flex-col gap-md">
        <h2 className="text-fm-title text-foreground">행사 및 요청 정보</h2>
        <TextField
          id="account-request-event-name"
          label="예정 행사명"
          placeholder="예: 2026 부산 바다축제"
          value={draft.eventName}
          error={errors.eventName}
          onChange={(value) => update("eventName", value)}
        />
        <div className="flex flex-col gap-xxs">
          <label
            htmlFor={CONTENT_ID}
            className="text-fm-label text-foreground-muted"
          >
            요청 내용
          </label>
          <textarea
            id={CONTENT_ID}
            rows={3}
            placeholder="담당 행사, 필요한 권한, 계정 사용 목적을 간단히 적어 주세요."
            value={draft.content}
            aria-invalid={errors.content !== undefined || undefined}
            aria-describedby={
              errors.content !== undefined ? `${CONTENT_ID}-error` : undefined
            }
            onChange={(event) => update("content", event.target.value)}
            className={cn(
              "w-full resize-none rounded-md border border-border bg-background p-md text-fm-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary",
              errors.content !== undefined && "border-error focus:border-error",
            )}
          />
          <FieldError id={`${CONTENT_ID}-error`} message={errors.content} />
        </div>
      </section>

      <div className="flex flex-col gap-xxs">
        <div className="flex items-start gap-xs">
          <Selector
            id={CONSENT_ID}
            checked={draft.consented}
            onCheckedChange={(checked) => update("consented", checked)}
          />
          <label
            htmlFor={CONSENT_ID}
            className="text-fm-caption text-foreground-muted"
          >
            발급 및 운영 안내를 위해 입력한 정보를 운영팀이 확인하는 것에
            동의합니다.
          </label>
        </div>
        <FieldError id={`${CONSENT_ID}-error`} message={errors.consented} />
      </div>

      {submitError !== null && (
        <p role="alert" className="text-fm-label text-error">
          {submitError}
        </p>
      )}

      <div className="flex flex-col gap-sm">
        <Button
          type="submit"
          text={isPending ? "요청 중…" : "관리자에게 계정 발급 요청"}
          disabled={isPending}
          className="w-full"
        />
        <p className="text-center text-fm-caption text-foreground-muted">
          문의 contact@fillmap.kr
        </p>
      </div>
    </form>
  );
};
