import { Check } from "lucide-react";
import { cn } from "@fillmap/ui-web";

/**
 * SOURCE: Figma "[v2] [행사 운영자 1-1] 계정 발급 요청" (15525:9198) 좌측 절차 스텝 3단 ·
 * 완료 화면(15525:9253)에서 1단 체크·2단 활성으로 전환된다 (MSG-543 AC 1·5).
 *
 * 위저드 진행 카드(`WizardProgress`, MSG-546)는 4단·본문 좌하단·"n / 4" 표기의 다른 시각
 * 언어라 재사용하지 않는다 — 여기는 신청자가 겪을 처리 절차 안내다(등록 단계가 아니다).
 */
const STEPS = [
  { title: "정보 입력", detail: "기관·담당자·행사 정보" },
  { title: "운영팀 검토", detail: "보통 1~2영업일 소요" },
  { title: "계정 수신", detail: "공식 이메일로 발급 안내" },
] as const;

export const AccountRequestSteps = ({
  currentStep,
}: {
  /** 진행 중인 단계 — 이전 단계는 완료(체크), 이후 단계는 대기 */
  currentStep: 1 | 2;
}) => (
  <ol className="flex flex-col">
    {STEPS.map(({ title, detail }, index) => {
      const order = index + 1;
      const isDone = order < currentStep;
      const isActive = order === currentStep;
      const isLast = order === STEPS.length;

      return (
        <li
          key={title}
          aria-current={isActive ? "step" : undefined}
          className="flex gap-sm"
        >
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-fm-caption",
                isDone && "bg-success text-foreground-inverse",
                isActive && "bg-primary text-primary-foreground",
                !isDone &&
                  !isActive &&
                  "border border-hairline-strong bg-surface-elevated text-foreground-muted",
              )}
            >
              {isDone ? (
                <Check aria-hidden className="size-3" strokeWidth={3} />
              ) : (
                order
              )}
            </span>
            {!isLast && (
              <span className="my-xxs w-0.5 flex-1 rounded-full bg-border" />
            )}
          </div>
          <div className={cn(!isLast && "pb-lg")}>
            <p className="text-fm-body-strong text-foreground">{title}</p>
            <p className="mt-0.5 text-fm-caption text-foreground-muted">
              {detail}
            </p>
          </div>
        </li>
      );
    })}
  </ol>
);
