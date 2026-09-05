import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useRequestPasswordReset } from "@/features/auth/api/use-password-mutations";
import { isEmailFormat } from "@/features/auth/model/email-format";
import { authErrorMessage } from "../auth-error";
import { AuthInfoCard } from "./AuthInfoCard";

/**
 * 비밀번호 재설정 요청 모드 (MSG-542 AC 9 — Figma 15650:2971).
 * 이메일 형식이 아니면 요청을 내보내지 않고 폼에서 안내한다.
 *
 * 성공은 가입 여부와 무관하게 항상 온다(서버의 은닉 정책) — "등록되지 않은 이메일" 같은
 * 안내는 만들 수 없고, 발송 완료 화면이 항상 뜨는 것이 정상 동작이다.
 */
export const ResetRequestForm = ({
  onSent,
}: {
  onSent: (email: string) => void;
}) => {
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending } = useRequestPasswordReset();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEmailFormat(email)) {
      setFormError("이메일 형식으로 입력해주세요");
      return;
    }
    setFormError(null);
    mutate(
      { email },
      {
        onSuccess: () => onSent(email),
        onError: (error) => setFormError(authErrorMessage(error)),
      },
    );
  };

  return (
    <>
      <Link
        to={CONSOLE_ROUTES.orgLogin}
        className="text-fm-label font-semibold text-primary"
      >
        ‹ 행사 운영자 로그인
      </Link>
      <h1 className="mt-lg text-fm-display text-foreground">비밀번호 재설정</h1>
      <p className="mt-xs text-fm-body text-foreground-muted">
        가입된 공식 이메일로 재설정 링크를 보내드립니다.
      </p>
      {/* noValidate: 형식 안내는 브라우저 기본 툴팁이 아니라 폼 안 문구로 낸다 (AC 9) —
          기본 검증이 켜져 있으면 submit 자체가 막혀 우리 안내가 뜨지 않는다 */}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="mt-lg flex flex-col gap-md"
      >
        <label className="flex flex-col gap-xs">
          <span className="text-fm-label text-foreground-body">
            공식 이메일
          </span>
          <Input
            type="email"
            placeholder="name@organization.go.kr"
            autoComplete="username"
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
        <Button
          type="submit"
          text="재설정 링크 받기"
          disabled={isPending}
          className="w-full"
        />
      </form>
      <div className="mt-lg">
        <AuthInfoCard
          title="이메일이 기억나지 않는다면"
          lines={[
            "계정은 기관 공식 이메일로만 발급됩니다. 주소가 확실하지 않으면",
            "운영팀에 문의해 주세요.  support@fillmap.kr",
          ]}
        />
      </div>
    </>
  );
};
