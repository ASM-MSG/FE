import { type ComponentProps, useState } from "react";
import { cn, Input } from "@fillmap/ui-web";

/**
 * 비밀번호 입력 + 평문 "보기" 토글 (MSG-542 AC 1 — Figma 15525:8633 필드 내부 우측 링크).
 *
 * 도메인 무관이라 성격상 ui-web 승격 후보지만 현재 사용처가 콘솔뿐이라 페이지 로컬에 둔다 —
 * 두 번째 사용처(MSG-544 비밀번호 변경)가 생길 때 승격한다(액션시트 선례의 두 번째 사용처 규칙).
 *
 * 토글 문구는 상태를 반영해 바뀐다(보기 ↔ 숨기기) — 눌린 상태를 문구 없이 색으로만
 * 구분하면 스크린리더에 아무 변화가 없다.
 */
type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type">;

export const PasswordInput = ({ className, ...props }: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        className={cn("pr-16", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        className="absolute inset-y-0 right-md text-fm-label font-semibold text-primary"
      >
        {isVisible ? "숨기기" : "보기"}
      </button>
    </div>
  );
};
