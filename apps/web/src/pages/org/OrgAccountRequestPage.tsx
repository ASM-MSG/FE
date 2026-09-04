import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
// 생성 mutation 옵션은 barrel(generated/index.ts) 미재수출 — 직접 경로 import (MSG-323 관례)
import { createMutation as createAccountRequestMutation } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { OrgAccountRequestCreateRequestDto } from "@/shared/api/generated/types.gen";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { authErrorMessage } from "./auth-error";
import { AccountRequestDonePanel } from "./ui/AccountRequestDonePanel";
import { AccountRequestForm } from "./ui/AccountRequestForm";
import { AccountRequestFrame } from "./ui/AccountRequestFrame";

/**
 * 계정 발급 요청 폼·완료 (MSG-543 — Figma 15525:9198·15525:9253) — 콘솔 셸 밖 공개 라우트.
 *
 * 라우트를 늘리지 않는다: 제출 성공 시 **같은 라우트 안에서** 완료 화면으로 전환된다
 * (`ResetSentPanel` 선례, MSG-542). 완료 상태는 휘발이라 새로고침·재진입 시 폼으로 돌아온다
 * (추정 6) — 신청 번호도 조회 API도 없어 복원할 것이 없다.
 *
 * 요청은 생성 `createMutation`(`POST /api/org-account-requests`)을 그대로 위임한다 —
 * 응답 본문(`200 OK` unknown)을 쓰지 않고 캐시 상호작용도 없어 전용 훅을 만들 이유가 없다.
 * 같은 이메일의 대기 요청은 서버가 새 내용으로 갱신하므로(openapi 실측) 중복 신청은 실패가
 * 아니고, 중복 전용 오류 UI도 없다(추정 1).
 */
export const OrgAccountRequestPage = () => {
  /** null = 폼 / 값 = 완료 화면(요약 카드 데이터원) */
  const [submitted, setSubmitted] =
    useState<OrgAccountRequestCreateRequestDto | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { mutate, isPending } = useMutation(createAccountRequestMutation());

  useDocumentTitle(
    formatDocumentTitle(
      submitted === null ? "행사 운영자 계정 발급 요청" : "계정 발급 요청 완료",
    ),
  );

  const handleSubmit = (body: OrgAccountRequestCreateRequestDto) => {
    setSubmitError(null);
    mutate(
      { body },
      {
        onSuccess: () => setSubmitted(body),
        onError: (error) => setSubmitError(authErrorMessage(error)),
      },
    );
  };

  if (submitted !== null) {
    return (
      <AccountRequestFrame
        headline={"요청이 접수되어\n관리자가 확인 중입니다."}
        description="검토 결과와 계정 정보는 입력한 공식 이메일로 전달됩니다."
        currentStep={2}
      >
        <p className="mt-lg text-fm-caption font-semibold text-primary">
          계정 발급 요청
        </p>
        <h1 className="mt-xxs text-fm-display text-foreground">
          계정 발급 요청 완료
        </h1>
        <p className="mt-xs text-fm-body text-foreground-muted">
          요청 내용을 확인하고 현재 처리 상태를 안내합니다.
        </p>
        <AccountRequestDonePanel summary={submitted} />
      </AccountRequestFrame>
    );
  }

  return (
    <AccountRequestFrame
      headline={"안전한 운영을 위해\n계정 발급 전 확인합니다."}
      description="기관과 담당자 정보를 보내주시면 운영팀이 확인한 뒤 공식 이메일로 계정과 초기 비밀번호를 안내합니다."
      currentStep={1}
    >
      <p className="mt-lg text-fm-caption font-semibold text-primary">
        행사 운영자 계정
      </p>
      <h1 className="mt-xxs text-fm-display text-foreground">
        행사 운영자 계정 발급 요청
      </h1>
      <p className="mt-xs text-fm-body text-foreground-muted">
        관리자 검토에 필요한 정보를 입력해 주세요. 승인 후 계정 정보는 공식
        이메일로 전달됩니다.
      </p>
      <AccountRequestForm
        isPending={isPending}
        submitError={submitError}
        onSubmit={handleSubmit}
      />
    </AccountRequestFrame>
  );
};
