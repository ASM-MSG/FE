import { type FormEvent, useState } from "react";
import { Button } from "@fillmap/ui-web";
import { useChangePassword } from "@/features/auth/api/use-password-mutations";
import { newPasswordError } from "@/features/auth/model/password-policy";
import { authErrorMessage } from "../auth-error";
import { AuthInfoCard } from "./AuthInfoCard";
import { NewPasswordFields } from "./NewPasswordFields";
import { PasswordInput } from "./PasswordInput";

/**
 * SOURCE: Figma "[v2] [행사 운영자 5] 비밀번호 변경" (15649:2967).
 *
 * `/org/settings`의 **내부 뷰 전환**이다 — 라우트를 신설하지 않는다(웨이브 2 규칙,
 * 542 재설정 화면의 3모드 선례). 그래서 시안의 전면 레이아웃·FILLMAP 워드마크 대신
 * 콘솔 셸 본문 안 센터 칼럼으로 렌더한다(추정 4 — `OrgPasswordSetupPage` 준용).
 *
 * 현재 비밀번호 불일치의 developCode는 미문서화라 코드 분기를 만들지 않고 서버 message를
 * 그대로 보인다(추정 6 — 542 `auth-error` 선례). 성공해도 서버가 다른 기기 세션을
 * 유지하므로 재로그인을 요구하지 않는다(추정 9).
 */
export const SettingsPasswordChangeView = ({
  onBack,
  onChanged,
}: {
  /** 계정 설정 뷰로 복귀 — 백링크·취소 */
  onBack: () => void;
  /** 변경 성공 — 완료 안내와 함께 계정 설정으로 복귀시킨다 (AC 7) */
  onChanged: () => void;
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending } = useChangePassword();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 현재 비밀번호 확인 → 새 비밀번호 정책 → 확인 일치 순으로 막는다 (AC 6)
    const reason =
      currentPassword === ""
        ? "현재 비밀번호를 입력해주세요"
        : newPasswordError(password, confirmation);
    setFormError(reason);
    if (reason !== null) return;
    mutate(
      { currentPassword, newPassword: password },
      {
        onSuccess: () => onChanged(),
        onError: (error) => setFormError(authErrorMessage(error)),
      },
    );
  };

  return (
    <div className="flex w-full justify-center">
      <div className="flex w-full max-w-100 flex-col">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-fm-label font-semibold text-primary"
        >
          ‹ 계정 설정
        </button>
        {/* 상태 배지 — Figma StatusBadge(15562:2215) Tone=주의: h28 · r14 · px14 */}
        <span className="mt-lg inline-flex h-7 items-center self-start rounded-full bg-warning/10 px-3.5 text-fm-caption font-semibold text-warning">
          계정 보안
        </span>
        <h1 className="mt-lg text-fm-display text-foreground">
          비밀번호를 변경하세요
        </h1>
        <p className="mt-xs text-fm-body text-foreground-muted">
          현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.
        </p>
        <form
          noValidate
          onSubmit={handleSubmit}
          className="mt-lg flex flex-col"
        >
          <label className="flex flex-col gap-xs">
            <span className="text-fm-label text-foreground-body">
              현재 비밀번호
            </span>
            <PasswordInput
              autoComplete="current-password"
              value={currentPassword}
              error={formError !== null}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <div className="mt-md">
            <NewPasswordFields
              password={password}
              confirmation={confirmation}
              onPasswordChange={setPassword}
              onConfirmationChange={setConfirmation}
              hasError={formError !== null}
            />
          </div>
          {formError !== null && (
            <p role="alert" className="mt-md text-fm-label text-error">
              {formError}
            </p>
          )}
          <Button
            type="submit"
            text="비밀번호 변경하기"
            disabled={isPending}
            className="mt-lg w-full"
          />
        </form>
        <div className="mt-lg">
          <AuthInfoCard
            title="안전한 비밀번호 팁"
            lines={[
              "다른 서비스에서 쓰던 비밀번호는 피해 주세요. 변경한 비밀번호는",
              "다음 로그인부터 바로 적용됩니다.",
            ]}
          />
        </div>
      </div>
    </div>
  );
};
