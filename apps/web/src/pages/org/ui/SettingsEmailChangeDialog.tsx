import { useState } from "react";
import { DialogShell, Input, ModalCard } from "@fillmap/ui-web";
import { useRequestEmailChange } from "@/features/org-account/api/use-org-account-mutations";
import { isEmailFormat } from "@/features/auth/model/email-format";
import { authErrorMessage } from "../auth-error";

/**
 * 아이디(공식 이메일) 변경 요청 모달 (MSG-544 AC 8).
 *
 * **시안에 입력 UI 노드가 없다** — Figma는 "이메일 변경 요청" 버튼까지만 있고, 모달은
 * 스펙 질문 1의 기본안으로 승인된 구성이다(대안: 카드 내 인라인 확장 폼).
 *
 * 서버 body는 `requestedEmail` 1필드뿐이다(사유 필드 없음 — 실측). 형식이 아니면 요청을
 * 내보내지 않고, 성공은 접수일 뿐이라 실제 변경은 관리자 승인 후다.
 *
 * 호출부가 열릴 때 마운트하고 닫을 때 언마운트한다 — 재요청마다 입력이 초기화된다.
 */
export const SettingsEmailChangeDialog = ({
  onClose,
  onRequested,
}: {
  onClose: () => void;
  /** 접수 성공 — 로그인 정보 카드의 승인 대기 안내를 이 이메일로 띄운다 (AC 8·9) */
  onRequested: (requestedEmail: string) => void;
}) => {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending } = useRequestEmailChange();

  const handleConfirm = () => {
    if (!isEmailFormat(email)) {
      setFormError("이메일 형식으로 입력해주세요");
      return;
    }
    setFormError(null);
    mutate(
      { requestedEmail: email },
      {
        onSuccess: () => onRequested(email),
        onError: (error) => setFormError(authErrorMessage(error)),
      },
    );
  };

  return (
    <DialogShell
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      srTitle="이메일 변경 요청"
    >
      <ModalCard
        title="이메일 변경 요청"
        description="바꾸려는 기관 공식 이메일을 입력해 주세요. 관리자가 승인하면 그 주소가 아이디가 됩니다."
        cancelText="취소"
        confirmText="변경 요청 보내기"
        confirmDisabled={isPending}
        onCancel={onClose}
        onClose={onClose}
        onConfirm={handleConfirm}
      >
        <label className="flex flex-col gap-xs">
          <span className="text-fm-label text-foreground-body">
            새 공식 이메일
          </span>
          <Input
            type="email"
            placeholder="name@organization.go.kr"
            autoComplete="email"
            value={email}
            error={formError !== null}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {formError !== null && (
          <p role="alert" className="text-fm-label text-error">
            {formError}
          </p>
        )}
      </ModalCard>
    </DialogShell>
  );
};
