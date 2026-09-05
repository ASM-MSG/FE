import { Button } from "@fillmap/ui-web";
import type {
  OrgSubmissionDetail,
  OrgSubmissionStatus,
} from "@/entities/org-submission/model/org-submission";
import { rejectionReasonLabels } from "@/features/org-submissions/model/rejection-reason";
import {
  historyTimeline,
  locationReviewText,
  processedAt,
  receivedAt,
} from "@/features/org-submissions/model/submission-detail-view";
import {
  formatKstDateTime,
  formatSubmissionDateRange,
} from "@/features/org-submissions/model/submission-format";

/**
 * SOURCE: Figma 심사 결과 상세 3상태 — 심사 중(15525:8923) · 승인(15525:8967) ·
 * 반려(15525:9011)의 결과 카드(2열 라벨/값 필드 + 와이드 "상태 변경 이력" + CTA + 각주).
 *
 * 상태 분기는 컴포넌트가 아니라 **필드 구성 함수 3벌**이다 (console-config·
 * SUBMISSION_FORM_CONFIGS 선례). 시안 대비 의도된 차이:
 * - 승인 번호(APR-…)는 대응 필드가 없어 "신청 번호"+`submissionNo`로 대체 (추정 5)
 * - "수정 대상(파일명)"은 presigned `imageUrl`에서 원본 파일명을 얻을 수 없어 생략 (추정 10)
 * - 승인 CTA는 "지도에서 보기"가 아니라 "목록으로 돌아가기" (추정 9 — 딥링크 좌표 파생 미보유)
 * - "상태 변경 이력" 값은 시안의 절차 안내 플레이스홀더가 아니라 실 history 라벨 흐름이다
 *   (추정 8). 시각까지 있는 전체 이력은 아래 신청 정보 섹션이 싣는다
 * - 접수일·승인일·처리일은 전용 필드가 없어 history 첫/마지막 전이에서 파생하고, 파생할
 *   이력이 없으면 필드를 생략한다 (추정 3)
 */
interface ResultField {
  label: string;
  value: string;
  /** 2열 그리드를 가로지르는 필드(이력·자유 서술) */
  wide?: boolean;
}

interface StatusResultView {
  fields: ResultField[];
  cta: string;
  footnote: string;
}

/** 이력 라벨 흐름 "제출 → 반려 → 재제출" (시안의 이력 필드 자리) */
const historyFlow = (detail: OrgSubmissionDetail): string =>
  historyTimeline(detail.history)
    .map((step) => step.label)
    .join(" → ");

/** 파생 시각 필드 — 이력이 없으면 필드 자체를 싣지 않는다 (추정 3) */
const dateField = (label: string, iso: string | null): ResultField[] =>
  iso === null ? [] : [{ label, value: formatKstDateTime(iso) }];

const inReviewView = (detail: OrgSubmissionDetail): StatusResultView => ({
  fields: [
    { label: "신청 번호", value: detail.submissionNo },
    ...dateField("접수일", receivedAt(detail.history)),
    { label: "현재 단계", value: "운영팀 검토 중" },
    { label: "처리 안내", value: "평균 1~2영업일" },
    { label: "상태 변경 이력", value: historyFlow(detail), wide: true },
    {
      label: "알림 수신",
      value: "심사 결과는 등록된 담당자 이메일로 안내됩니다.",
      wide: true,
    },
  ],
  cta: "목록으로 돌아가기",
  footnote: "심사 중에는 신청 내용을 수정할 수 없습니다.",
});

const approvedView = (detail: OrgSubmissionDetail): StatusResultView => ({
  fields: [
    { label: "신청 번호", value: detail.submissionNo },
    ...dateField("승인일", processedAt(detail.history)),
    { label: "지도 노출", value: "노출 중" },
    { label: "행사방", value: "생성 완료" },
    { label: "상태 변경 이력", value: historyFlow(detail), wide: true },
    {
      label: "운영 상태",
      value: "행사 종료일까지 자동으로 노출됩니다.",
      wide: true,
    },
  ],
  cta: "목록으로 돌아가기",
  footnote: "승인된 행사 정보 변경은 운영팀에 문의해 주세요.",
});

const rejectedView = (detail: OrgSubmissionDetail): StatusResultView => {
  const reasonCodes = detail.rejection?.reasonCodes ?? [];

  return {
    fields: [
      ...(detail.rejection === null
        ? []
        : [
            {
              label: "반려 항목",
              value: rejectionReasonLabels(detail.rejection.reasonCodes),
            },
          ]),
      ...dateField("처리일", processedAt(detail.history)),
      {
        label: "기존 입력",
        value: formatSubmissionDateRange(detail.startsOn, detail.endsOn),
      },
      {
        label: "위치 검토",
        value: locationReviewText(detail.locations, reasonCodes),
      },
      ...(detail.rejection === null
        ? []
        : [
            {
              label: "검토 의견",
              value: detail.rejection.reasonText,
              wide: true,
            },
          ]),
      { label: "상태 변경 이력", value: historyFlow(detail), wide: true },
    ],
    cta: "수정 후 재제출",
    footnote: "수정본을 제출하면 상태가 '재심사 중'으로 변경됩니다.",
  };
};

const STATUS_VIEWS: Record<
  OrgSubmissionStatus,
  (detail: OrgSubmissionDetail) => StatusResultView
> = {
  IN_REVIEW: inReviewView,
  APPROVED: approvedView,
  REJECTED: rejectedView,
};

interface SubmissionResultCardProps {
  detail: OrgSubmissionDetail;
  /** 서버 확정 3값 — 미지 status는 호출부가 카드 자체를 렌더하지 않는다 (AC 11) */
  status: OrgSubmissionStatus;
  onBackToList: () => void;
  onReapply: () => void;
}

export const SubmissionResultCard = ({
  detail,
  status,
  onBackToList,
  onReapply,
}: SubmissionResultCardProps) => {
  const view = STATUS_VIEWS[status](detail);

  return (
    <section
      aria-label="심사 결과 상세"
      className="flex flex-col gap-lg rounded-sm border border-border bg-background p-lg"
    >
      <dl className="grid grid-cols-2 gap-md">
        {view.fields.map((field) => (
          <div
            key={field.label}
            className={field.wide === true ? "col-span-2" : undefined}
          >
            <dt className="text-fm-label text-foreground-muted">
              {field.label}
            </dt>
            <dd className="mt-xxs text-fm-body text-foreground">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-end">
        <Button
          text={view.cta}
          onClick={status === "REJECTED" ? onReapply : onBackToList}
        />
      </div>

      <p className="text-fm-caption text-foreground-muted">{view.footnote}</p>
    </section>
  );
};
