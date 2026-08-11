import { type FormEvent, useState } from "react";
import { Button, Input } from "@fillmap/ui-web";
import { useEmailLogin } from "../api/use-auth-mutations";
import { useLoginModalStore } from "../model/login-modal-store";

/**
 * 개발용 로그인 폼 본체 — 이메일·비밀번호로 `/api/auth/login`을 호출한다 (MSG-352 A2~A5).
 * 자격증명은 입력 필드로 받는다 — 개발 계정 비밀번호를 코드에 커밋하지 않는다(추정 3).
 * 실패 시 실패 메시지를 표시하고(A5), 성공 시 로그인 모달을 닫는다 — 카카오 로그인이
 * 리다이렉트로 모달을 벗어나는 것과 동등한 완료 동선.
 */
const DevLoginForm = () => {
  const closeModal = useLoginModalStore((s) => s.closeModal);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate, isPending, isError } = useEmailLogin();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // per-call 콜백은 패널이 요청 중 계속 마운트돼 있어 안전하다 — StrictMode 유실 경로
    // (초기 mount→unmount→mount 중 시작된 요청)와 달리 제출은 사용자 조작 이후다
    mutate({ email, password }, { onSuccess: closeModal });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-xs border-t border-border pt-md"
    >
      <span className="text-fm-label text-foreground-muted">
        개발용 로그인 (DEV 전용)
      </span>
      <Input
        type="email"
        aria-label="이메일"
        placeholder="개발 계정 이메일"
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        type="password"
        aria-label="비밀번호"
        placeholder="비밀번호"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {isError && (
        <p role="alert" className="text-fm-label text-error">
          로그인에 실패했어요. 이메일·비밀번호를 확인해주세요
        </p>
      )}
      <Button
        type="submit"
        variant="secondary"
        text="개발용 로그인"
        disabled={isPending}
        className="w-full"
      />
    </form>
  );
};

/**
 * 개발 모드 전용 로그인 패널 (MSG-352 A1) — dev 빌드에서만 렌더된다.
 * `import.meta.env.DEV`는 Vite가 빌드 시 정적 치환하므로 프로덕션 번들에서는
 * 이 분기가 상수 false로 접혀 폼 코드가 트리셰이킹된다 — 프로덕션 미노출.
 */
export const DevLoginPanel = () =>
  import.meta.env.DEV ? <DevLoginForm /> : null;
