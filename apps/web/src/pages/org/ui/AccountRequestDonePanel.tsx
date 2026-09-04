import { Check } from "lucide-react";
import { ROUTES } from "@/app/routes";
import type { OrgAccountRequestCreateRequestDto } from "@/shared/api/generated/types.gen";
import { redirectTo } from "@/shared/navigation";

/**
 * SOURCE: Figma "[v2] [행사 운영자 1-2] 계정 발급 요청 완료" (15525:9253) 완료 카드 —
 * 체크 원 + 접수 문구 + 상태 칩 + 요청 정보 요약 + 다음 안내 + 홈 복귀 (MSG-543 AC 5·6).
 *
 * 요약은 **제출한 값**으로 구성한다: 응답이 `200 OK` unknown이라 서버가 주는 데이터가 없다
 * (신청 번호도 부여하지 않는다) — Figma의 "부산광역시 관광마이스과" 등은 예시 데이터다.
 *
 * "검토 대기"는 FE 고정 문구다 — 상태 조회 API가 없고 제출 직후는 항상 대기다. 상태 칩은
 * `SubmissionStatusChip`(features/org-submissions)이 신청 상태 enum을 아는 도메인 컴포넌트라
 * 재사용하지 않고, ui-web `Chip`은 체크 아이콘이 붙는 상호작용 필터 칩이라 부적합하다.
 *
 * "필맵 홈으로 돌아가기"는 라우터 navigate가 아니라 `redirectTo` 하드 이동이다(추정 2) —
 * 콘솔은 유저 앱과 분리된 단일 청크 세계라 진입이 문서 이동이었고 복귀도 대칭이다.
 */
type AccountRequestSummary = Pick<
  OrgAccountRequestCreateRequestDto,
  "orgName" | "email" | "eventName"
>;

/** 요약 카드 3행 — Figma 순서 그대로 (기관 → 공식 이메일 → 예정 행사) */
const SUMMARY_ROWS: { field: keyof AccountRequestSummary; label: string }[] = [
  { field: "orgName", label: "기관" },
  { field: "email", label: "공식 이메일" },
  { field: "eventName", label: "예정 행사" },
];

export const AccountRequestDonePanel = ({
  summary,
}: {
  summary: AccountRequestSummary;
}) => (
  <section className="mt-lg flex flex-col items-center rounded-sm border border-border bg-surface-elevated px-xl py-xxl">
    <span className="flex size-22 items-center justify-center rounded-md bg-success text-foreground-inverse">
      <Check aria-hidden className="size-11" strokeWidth={4} />
    </span>
    <h2 className="mt-lg text-fm-display text-foreground">
      요청이 접수되었습니다
    </h2>
    <p className="mt-sm text-center text-fm-body text-foreground-muted">
      운영팀이 기관과 담당자 정보를 확인한 뒤
      <br />
      공식 이메일로 계정과 초기 비밀번호를 보내드립니다.
    </p>
    <span className="mt-md rounded-full bg-warning/10 px-sm py-0.5 text-fm-caption font-semibold text-warning">
      검토 대기
    </span>
    <div className="mt-lg w-full rounded-sm border border-border px-lg py-lg">
      <h3 className="text-fm-title text-foreground">요청 정보</h3>
      <dl className="mt-sm flex flex-col gap-xs">
        {SUMMARY_ROWS.map(({ field, label }) => (
          <div key={field} className="flex gap-lg">
            <dt className="w-20 shrink-0 text-fm-caption text-foreground-muted">
              {label}
            </dt>
            <dd className="text-fm-body-strong text-foreground-body">
              {summary[field]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
    <div className="mt-md flex w-full gap-lg rounded-sm bg-surface px-lg py-md">
      <p className="shrink-0 text-fm-body-strong text-primary">다음 안내</p>
      <p className="text-fm-caption text-foreground-body">
        검토에는 보통 1~2영업일이 소요되며, 반려 시 사유와 재요청 방법도 함께
        안내합니다.
      </p>
    </div>
    <button
      type="button"
      onClick={() => redirectTo(ROUTES.home)}
      className="mt-lg flex h-11 w-full items-center justify-center rounded-sm border border-primary bg-surface-elevated text-fm-title font-semibold text-primary"
    >
      필맵 홈으로 돌아가기
    </button>
  </section>
);
