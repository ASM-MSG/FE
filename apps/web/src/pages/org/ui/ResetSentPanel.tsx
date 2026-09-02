import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useRequestPasswordReset } from "@/features/auth/api/use-password-mutations";
import { authErrorMessage } from "../auth-error";
import {
  RESET_LINK_VALID_MINUTES,
  resetLinkExpiry,
} from "../reset-link-expiry";

/**
 * 재설정 링크 발송 완료 (MSG-542 AC 10 — Figma 15650:3001) — 라우트를 바꾸지 않고
 * 요청 모드에서 이 패널로 전환된다.
 *
 * 보낸 시각·유효 기간은 클라이언트 제출 시각 기준 계산이다(추정 6 — 서버 응답에 시각 없음).
 * "다시 보내기"는 같은 이메일로 재요청하고, 성공 시 시각이 갱신된다(서버는 재요청 시
 * 이전 링크를 즉시 무효화한다).
 */
export const ResetSentPanel = ({
  email,
  sentAt,
  onResent,
}: {
  email: string;
  sentAt: Date;
  onResent: () => void;
}) => {
  const { mutate, isPending, error } = useRequestPasswordReset();
  const { sentAtLabel, expiresAtLabel } = resetLinkExpiry(sentAt);

  return (
    <div className="flex flex-col items-center">
      <span className="flex size-18 items-center justify-center rounded-full bg-success text-foreground-inverse">
        <Check className="size-9" strokeWidth={4} />
      </span>
      <h1 className="mt-lg text-fm-display text-foreground">
        재설정 링크를 보냈습니다
      </h1>
      <p className="mt-md text-center text-fm-body text-foreground-muted">
        {email} 로 보냈어요.
        <br />
        링크는 {RESET_LINK_VALID_MINUTES}분간 유효합니다.
      </p>
      <dl className="mt-lg flex w-full flex-col gap-md rounded-md bg-surface px-lg py-lg">
        <div className="flex items-center justify-between">
          <dt className="text-fm-caption text-foreground-muted">보낸 시각</dt>
          <dd className="text-fm-label font-semibold text-foreground-body">
            {sentAtLabel}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-fm-caption text-foreground-muted">유효 기간</dt>
          <dd className="text-fm-label font-semibold text-foreground-body">
            {expiresAtLabel}까지 · {RESET_LINK_VALID_MINUTES}분
          </dd>
        </div>
      </dl>
      {error !== null && (
        <p role="alert" className="mt-md text-fm-label text-error">
          {authErrorMessage(error)}
        </p>
      )}
      <Link
        to={CONSOLE_ROUTES.orgLogin}
        className="mt-lg flex h-12 w-full items-center justify-center rounded-md border border-border bg-canvas text-fm-title font-semibold text-foreground"
      >
        로그인 페이지로 돌아가기
      </Link>
      <p className="mt-md text-fm-label font-semibold text-primary">
        메일이 안 왔나요?{" "}
        <button
          type="button"
          disabled={isPending}
          onClick={() => mutate({ email }, { onSuccess: onResent })}
          className="font-semibold underline"
        >
          다시 보내기
        </button>
      </p>
    </div>
  );
};
