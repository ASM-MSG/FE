import {
  PASSWORD_RULE_HINT,
  validateNewPassword,
} from "@/features/auth/model/password-policy";
import { PasswordInput } from "./PasswordInput";

/**
 * 새 비밀번호 + 확인 입력 한 묶음 (MSG-542 AC 5·6 — Figma 15836:357).
 * 첫 로그인 설정(setup)과 재설정 링크 확정(reset ?token=)이 공유한다 — 같은 서버 정책을
 * 쓰는 폼이 둘이라 규칙 힌트·게이지·라벨을 한 곳에 둔다.
 *
 * 충족 게이지는 강도 측정이 아니라 요건 3개(길이·영문·숫자)의 충족 비율 표시다(추정 8).
 * 폭이 값에 따라 변하므로 인라인 스타일로 준다(CourseCard·RegionProgress 선례).
 */
export const NewPasswordFields = ({
  password,
  confirmation,
  onPasswordChange,
  onConfirmationChange,
  hasError,
}: {
  password: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  hasError: boolean;
}) => {
  const { checks, satisfiedCount } = validateNewPassword(password);

  return (
    <>
      <label className="flex flex-col gap-xs">
        <span className="text-fm-label text-foreground-body">새 비밀번호</span>
        <PasswordInput
          autoComplete="new-password"
          value={password}
          error={hasError}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </label>
      <div className="mt-sm flex flex-col gap-xs">
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-success transition-[width]"
            style={{ width: `${(satisfiedCount / checks.length) * 100}%` }}
          />
        </div>
        <p className="text-fm-caption text-foreground-muted">
          {PASSWORD_RULE_HINT}
        </p>
      </div>
      <label className="mt-md flex flex-col gap-xs">
        <span className="text-fm-label text-foreground-body">
          새 비밀번호 확인
        </span>
        <PasswordInput
          autoComplete="new-password"
          value={confirmation}
          error={hasError}
          onChange={(event) => onConfirmationChange(event.target.value)}
        />
      </label>
    </>
  );
};
