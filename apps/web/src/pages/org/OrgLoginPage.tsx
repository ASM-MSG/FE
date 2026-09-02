import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useEmailLogin } from "@/features/auth/api/use-auth-mutations";
import { useSessionRole } from "@/features/auth/api/use-session-role";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { authErrorMessage } from "./auth-error";
import { consoleLandingPath } from "./console-landing";
import { AuthInfoCard } from "./ui/AuthInfoCard";
import { ConsoleAuthFrame } from "./ui/ConsoleAuthFrame";
import { PasswordInput } from "./ui/PasswordInput";

/**
 * 콘솔 로그인 (MSG-542 AC 1·2·3·13 — Figma 15525:8633) — 공개 라우트, 콘솔 셸 밖.
 *
 * 로그인 훅은 신설하지 않는다: 기존 `useEmailLogin`(MSG-352)이 `POST /api/auth/login` 호출 +
 * X-Device-Id 보관 + accessToken 저장 + `queryClient.clear()`까지 이미 수행한다.
 * **캐시 clear가 곧 세션 전환**이라 KAKAO(USER) 세션이 있어도 다음 getMe가 새 role을 준다 (AC 13).
 *
 * 착지 후 mustChange 판정은 MSG-541 게이트의 몫이다 — 이 화면은 status를 조회하지 않는다 (AC 4).
 * 상단 "‹ 행사 운영자 안내" 백링크는 대상 화면이 웨이브에 없어 생략한다 (추정 3).
 */

/** ORG·ADMIN이 아닌 계정 안내 (MSG-541 추정 3이 이 티켓에 위임한 문구, 추정 4) */
const NO_CONSOLE_ACCESS_MESSAGE =
  "일반 회원 계정으로는 콘솔을 이용할 수 없습니다. 발급받은 행사 운영자 계정으로 로그인해 주세요";

export const OrgLoginPage = () => {
  useDocumentTitle(formatDocumentTitle("행사 운영자 로그인"));
  const navigate = useNavigate();
  // 가드 회송으로 이 화면에 온 일반 회원 세션에도 같은 안내를 보인다 — 폼은 그대로 동작한다
  const { role } = useSessionRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending } = useEmailLogin();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    mutate(
      { email, password },
      {
        onSuccess: (envelope) => {
          // 착지 판정에만 쓰는 1회용 role — persist하지 않는다(정본은 getMe, MSG-541 추정 1)
          const landing = consoleLandingPath(unwrapEnvelope(envelope).role);
          if (landing === null) {
            setFormError(NO_CONSOLE_ACCESS_MESSAGE);
            return;
          }
          navigate(landing, { replace: true });
        },
        onError: (error) => setFormError(authErrorMessage(error)),
      },
    );
  };

  return (
    <ConsoleAuthFrame subtitle="행사 운영자 행사 등록">
      <h1 className="text-fm-display text-foreground">행사 운영자 로그인</h1>
      <p className="mt-xs text-fm-body text-foreground-muted">
        관리자가 발급한 이메일과 초기 비밀번호를 입력하세요.
      </p>
      {role === "USER" && (
        <p className="mt-md text-fm-label text-foreground-body">
          {NO_CONSOLE_ACCESS_MESSAGE}
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-lg flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="text-fm-label text-foreground-body">이메일</span>
          {/* placeholder 없음: Figma 로그인 필드는 예시 값(tourism@busan.go.kr)이 채워진
              상태만 그려져 빈 상태 문구가 없다 — 예시 데이터 하드코딩 금지(스펙 오탐 방지) */}
          <Input
            type="email"
            autoComplete="username"
            value={email}
            error={formError !== null}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <div className="flex flex-col gap-xs">
          <div className="flex items-center justify-between">
            <label
              htmlFor="org-login-password"
              className="text-fm-label text-foreground-body"
            >
              비밀번호
            </label>
            <Link
              to={CONSOLE_ROUTES.orgPasswordReset}
              className="text-fm-label font-semibold text-primary"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>
          <PasswordInput
            id="org-login-password"
            autoComplete="current-password"
            value={password}
            error={formError !== null}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {formError !== null && (
          <p role="alert" className="text-fm-label text-error">
            {formError}
          </p>
        )}
        <Button
          type="submit"
          text="행사 운영자 계정으로 로그인"
          disabled={isPending}
          className="w-full"
        />
      </form>
      <div className="mt-lg">
        <AuthInfoCard
          tone="outlined"
          title="계정이 아직 없나요?"
          lines={[
            "기관 정보를 보내면 운영팀 검토 후 계정을 발급합니다.",
            "문의  contact@fillmap.kr",
          ]}
        />
      </div>
      <Link
        to={CONSOLE_ROUTES.orgAccountRequest}
        className="mt-lg self-center text-fm-label font-semibold text-primary"
      >
        계정 발급 요청하기 →
      </Link>
    </ConsoleAuthFrame>
  );
};
