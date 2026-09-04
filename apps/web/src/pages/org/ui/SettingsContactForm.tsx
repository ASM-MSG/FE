import { type FormEvent, useState } from "react";
import { Button, Input } from "@fillmap/ui-web";
import { useUpdateOrgProfile } from "@/features/org-account/api/use-org-account-mutations";
import {
  CONTACT_NAME_RULE_HINT,
  CONTACT_PHONE_RULE_HINT,
  contactFormError,
} from "@/features/org-account/model/org-profile-policy";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { authErrorMessage } from "../auth-error";

/**
 * SOURCE: Figma "[v2] [행사 운영자 5] 계정 설정" (15651:2974) — 카드 2 "담당자 정보".
 *
 * 담당자 이름·연락처는 기관 인증의 근거가 아니라 자체 수정이 허용된다 (MSG-544 AC 3·4).
 * 서버 제약을 어기는 값은 요청을 내보내지 않고 폼에서 안내한다 —
 * 판정은 `org-profile-policy`(플랫폼 중립)가 소유하고 이 파일은 표출만 한다.
 *
 * 연락처를 한 번도 입력하지 않은 계정은 `contactPhone: null`로 온다 — 빈 입력으로 시작하고,
 * 두 필드가 모두 required인 PATCH라 저장하려면 연락처도 채워야 한다.
 *
 * 저장 성공 시 폼 값을 **응답(변경 후 프로필)으로 재동기**한다(추정 8) — 서버가 정규화한
 * 값이 화면과 어긋나지 않게 한다. 캐시 갱신은 훅이 맡는다(사이드바와 공유).
 *
 * 초기값 prop은 **마운트 시 1회만** 읽는다 — 포커스 refetch 등으로 프로필 캐시가 갱신돼
 * prop이 바뀌어도 입력값을 덮지 않는다. 백그라운드 갱신이 편집 중 드래프트를 지우면 안 되고,
 * 두 필드를 항상 함께 보내는 PATCH라 최종 값은 마지막 저장이 이긴다. 재동기 경로는 저장 성공뿐.
 */
export const SettingsContactForm = ({
  contactName: initialName,
  contactPhone: initialPhone,
  onSaved,
}: {
  contactName: string;
  contactPhone: string | null;
  /** 저장 완료 안내는 페이지가 소유한다 — 비밀번호 변경 완료와 같은 자리를 쓴다 */
  onSaved: () => void;
}) => {
  const [contactName, setContactName] = useState(initialName);
  const [contactPhone, setContactPhone] = useState(initialPhone ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending } = useUpdateOrgProfile();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = contactFormError(contactName, contactPhone);
    setFormError(reason);
    if (reason !== null) return;
    mutate(
      { contactName, contactPhone },
      {
        onSuccess: (response) => {
          const saved = unwrapEnvelope(response);
          setContactName(saved.contactName);
          setContactPhone(saved.contactPhone ?? "");
          onSaved();
        },
        onError: (error) => setFormError(authErrorMessage(error)),
      },
    );
  };

  return (
    <section className="rounded-md border border-border bg-surface-elevated">
      <h2 className="border-b border-border px-lg py-md text-fm-title text-foreground">
        담당자 정보
      </h2>
      {/* noValidate: 규칙 안내는 브라우저 기본 툴팁이 아니라 폼 안 문구로 낸다 (AC 3) */}
      <form noValidate onSubmit={handleSubmit} className="px-lg py-md">
        <div className="grid grid-cols-2 gap-lg">
          <label className="flex flex-col gap-xs">
            <span className="text-fm-label text-foreground-body">담당자</span>
            <Input
              value={contactName}
              autoComplete="name"
              error={formError === CONTACT_NAME_RULE_HINT}
              onChange={(event) => setContactName(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-xs">
            <span className="text-fm-label text-foreground-body">연락처</span>
            <Input
              value={contactPhone}
              autoComplete="tel"
              inputMode="tel"
              error={formError === CONTACT_PHONE_RULE_HINT}
              onChange={(event) => setContactPhone(event.target.value)}
            />
          </label>
        </div>
        {formError !== null && (
          <p role="alert" className="mt-md text-fm-label text-error">
            {formError}
          </p>
        )}
        <div className="mt-md flex justify-end">
          <Button
            type="submit"
            text="변경 내용 저장"
            size="sm"
            disabled={isPending}
          />
        </div>
      </form>
    </section>
  );
};
