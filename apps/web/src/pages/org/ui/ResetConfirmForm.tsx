import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useConfirmPasswordReset } from "@/features/auth/api/use-password-mutations";
import { newPasswordError } from "@/features/auth/model/password-policy";
import { authErrorMessage } from "../auth-error";
import { NewPasswordFields } from "./NewPasswordFields";

/**
 * 재설정 링크 진입 모드 (MSG-542 AC 11·12) — `/org/password/reset?token=...`.
 * Figma 노드가 없는 화면이라 첫 로그인 설정(15836:357)의 폼 구성을 준용하고 문구만
 * 재설정 맥락으로 바꾼다.
 *
 * 성공 시 서버가 전 기기 세션을 무효화하므로 훅이 로컬 세션을 정리한다(추정 7) — 화면은
 * 다시 로그인하도록 안내한다. 실패(토큰 만료·무효)는 서버 message + **재요청 경로**를 함께
 * 보인다: 만료된 링크를 든 사용자에게 막다른 오류만 주면 복구 동선이 없다.
 */
export const ResetConfirmForm = ({ token }: { token: string }) => {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending, isSuccess, error } = useConfirmPasswordReset();

  if (isSuccess) {
    return (
      <>
        <h1 className="text-fm-display text-foreground">
          새 비밀번호를 설정했습니다
        </h1>
        <p className="mt-xs text-fm-body text-foreground-muted">
          기존 기기의 로그인은 모두 해제되었습니다. 새 비밀번호로 다시 로그인해
          주세요.
        </p>
        <Link
          to={CONSOLE_ROUTES.orgLogin}
          className="mt-lg flex h-12 w-full items-center justify-center rounded-md bg-primary text-fm-title font-semibold text-primary-foreground"
        >
          로그인 페이지로 돌아가기
        </Link>
      </>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reason = newPasswordError(password, confirmation);
    setFormError(reason);
    if (reason !== null) return;
    mutate({ token, newPassword: password });
  };

  const serverError = error !== null ? authErrorMessage(error) : null;

  return (
    <>
      <h1 className="text-fm-display text-foreground">새 비밀번호 설정</h1>
      <p className="mt-xs text-fm-body text-foreground-muted">
        재설정 링크로 접속했습니다. 앞으로 사용할 새 비밀번호를 설정해 주세요.
      </p>
      <form onSubmit={handleSubmit} className="mt-lg flex flex-col">
        <NewPasswordFields
          password={password}
          confirmation={confirmation}
          onPasswordChange={setPassword}
          onConfirmationChange={setConfirmation}
          hasError={formError !== null}
        />
        {(formError ?? serverError) !== null && (
          <p role="alert" className="mt-md text-fm-label text-error">
            {formError ?? serverError}
          </p>
        )}
        <Button
          type="submit"
          text="새 비밀번호로 변경하기"
          disabled={isPending}
          className="mt-lg w-full"
        />
      </form>
      {serverError !== null && (
        <Link
          to={CONSOLE_ROUTES.orgPasswordReset}
          className="mt-md text-fm-label font-semibold text-primary"
        >
          재설정 링크 다시 요청하기
        </Link>
      )}
    </>
  );
};
