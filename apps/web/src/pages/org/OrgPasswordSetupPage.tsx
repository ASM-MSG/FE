import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useSetInitialPassword } from "@/features/auth/api/use-password-mutations";
import { useSessionRole } from "@/features/auth/api/use-session-role";
import { newPasswordError } from "@/features/auth/model/password-policy";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { authErrorMessage, isPasswordAlreadySetError } from "./auth-error";
import { consoleLandingPath } from "./console-landing";
import { AuthInfoCard } from "./ui/AuthInfoCard";
import { NewPasswordFields } from "./ui/NewPasswordFields";

/**
 * 첫 로그인 비밀번호 강제 설정 (MSG-542 AC 5·6·7·8 — Figma 15836:357) —
 * MSG-541 mustChange 게이트의 착지 화면(ORG·ADMIN 공용)이다.
 *
 * **콘솔 셸 본문(Outlet) 안에 센터 정렬**로 렌더한다(스펙 질문 2 기본안 승인): 라우트가
 * `OrgConsoleLayout` 안이고 router.tsx는 웨이브 내 수정 금지라 Figma의 전면 레이아웃과
 * 어긋나는데, 사이드바가 보여도 게이트가 다른 메뉴 진입을 되돌리므로 기능상 무해하다.
 * 그래서 공개 화면들의 `ConsoleAuthFrame`(워드마크 헤더)을 쓰지 않는다 — 셸이 브랜딩을 갖는다.
 *
 * 성공 후 착지는 role별 홈이다 — 비밀번호 상태 캐시 갱신은 훅이 맡아 게이트가 다시
 * 발동하지 않는다 (AC 7).
 */
export const OrgPasswordSetupPage = () => {
  useDocumentTitle(formatDocumentTitle("비밀번호 설정"));
  const navigate = useNavigate();
  const { role } = useSessionRole();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { mutate, isPending, error } = useSetInitialPassword();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 서버 정책·확인 일치 선검증 — 미충족이면 요청을 내보내지 않는다 (AC 6)
    const reason = newPasswordError(password, confirmation);
    setFormError(reason);
    if (reason !== null) return;
    mutate(
      { newPassword: password },
      {
        onSuccess: () => {
          const landing = consoleLandingPath(role);
          if (landing !== null) navigate(landing, { replace: true });
        },
      },
    );
  };

  const serverError = error !== null ? authErrorMessage(error) : null;

  return (
    <div className="flex w-full justify-center">
      <div className="flex w-full max-w-100 flex-col">
        {/* 상태 배지 — Figma StatusBadge(15562:2215) Tone=진행: h28 · r14 · px14 */}
        <span className="inline-flex h-7 items-center self-start rounded-full bg-warning/10 px-3.5 text-fm-caption font-semibold text-warning">
          비밀번호 설정 필요
        </span>
        <h1 className="mt-lg text-fm-display text-foreground">
          비밀번호를 새로 설정하세요
        </h1>
        <p className="mt-xs text-fm-body text-foreground-muted">
          첫 로그인입니다. 앞으로 사용할 새 비밀번호를 설정해 주세요.
        </p>
        {isPasswordAlreadySetError(error) ? (
          <div className="mt-lg flex flex-col items-start gap-md">
            <p role="alert" className="text-fm-body text-foreground-body">
              이미 비밀번호를 설정한 계정입니다. 비밀번호를 바꾸려면 계정
              설정에서 변경해 주세요.
            </p>
            <Link
              to={consoleLandingPath(role) ?? CONSOLE_ROUTES.orgHome}
              className="text-fm-label font-semibold text-primary"
            >
              콘솔 홈으로 이동
            </Link>
          </div>
        ) : (
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
              text="설정하고 콘솔 시작하기"
              disabled={isPending}
              className="mt-lg w-full"
            />
          </form>
        )}
        <div className="mt-lg">
          <AuthInfoCard
            title="왜 지금 바꿔야 하나요?"
            lines={[
              "초기 비밀번호는 발급 과정에서 전달된 값입니다. 바꾸기 전까지는",
              "이 계정으로 한 행사 등록·수정이 본인의 기록이라고 말할 수 없습니다.",
            ]}
          />
        </div>
      </div>
    </div>
  );
};
