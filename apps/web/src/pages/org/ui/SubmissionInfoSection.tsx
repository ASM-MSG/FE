import { useState } from "react";
import type { OrgSubmissionDetail } from "@/entities/org-submission/model/org-submission";
import {
  historyTimeline,
  summarizeLocations,
  typeSpecificField,
} from "@/features/org-submissions/model/submission-detail-view";
import {
  formatKstDateTime,
  formatSubmissionDateRange,
} from "@/features/org-submissions/model/submission-format";
import { submissionTypeLabel } from "@/features/org-submissions/model/submission-status";

/**
 * 제출본 기본 정보 · 위치 영역 요약 · 신청 이력 (MSG-549 AC 9).
 *
 * **상세 시안에 없는 섹션**이다 — 티켓의 "상세에 기본 정보·위치 영역 요약(제출본)이 함께
 * 보인다"·"신청 이력이 보인다" 요구로 추가했고, 스타일은 결과 카드의 라벨/값 그리드를
 * 답습한다(Figma 대조 비대상 — 스펙 오탐 방지 항목).
 *
 * 상태 3분기와 무관하게 항상 렌더되므로 미지 status의 상세도 이 섹션으로 수렴한다 (AC 11).
 */
const Field = ({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) => (
  <div className={wide ? "col-span-2" : undefined}>
    <dt className="text-fm-label text-foreground-muted">{label}</dt>
    <dd className="mt-xxs text-fm-body text-foreground">{value}</dd>
  </div>
);

/**
 * 대표 이미지 — presigned GET URL이 만료되면 자리표시로 대체한다 (MSG-552 선례).
 * 실패 상태는 src가 바뀌면 리셋돼야 하므로 호출부가 `key`로 리마운트한다.
 */
const SubmissionImage = ({ src, alt }: { src: string; alt: string }) => {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div className="flex aspect-video w-64 items-center justify-center rounded-sm bg-surface text-fm-caption text-foreground-muted">
        이미지를 불러올 수 없어요
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="aspect-video w-64 rounded-sm bg-surface object-cover"
    />
  );
};

export const SubmissionInfoSection = ({
  detail,
}: {
  detail: OrgSubmissionDetail;
}) => {
  const typeField = typeSpecificField(detail);
  const locations = summarizeLocations(detail.locations);
  const timeline = historyTimeline(detail.history);

  return (
    <section
      aria-label="신청 정보"
      className="flex flex-col gap-lg rounded-sm border border-border bg-background p-lg"
    >
      <div className="flex flex-col gap-sm">
        <h2 className="text-fm-title text-foreground">기본 정보</h2>
        <dl className="grid grid-cols-2 gap-md">
          <Field label="주최 기관" value={detail.organizerName} />
          <Field label="등록 유형" value={submissionTypeLabel(detail.type)} />
          <Field
            label="행사 기간"
            value={formatSubmissionDateRange(detail.startsOn, detail.endsOn)}
          />
          {typeField !== null && (
            <Field label={typeField.label} value={typeField.value} />
          )}
          <Field label="행사 소개" value={detail.description} wide />
        </dl>
        <SubmissionImage
          key={detail.imageUrl}
          src={detail.imageUrl}
          alt={`${detail.title} 대표 이미지`}
        />
      </div>

      <div className="flex flex-col gap-sm">
        <h2 className="text-fm-title text-foreground">위치 영역 요약</h2>
        <p className="text-fm-body-strong text-foreground">{locations.text}</p>
        {locations.items.length > 0 && (
          <ul aria-label="제출 위치 목록" className="flex flex-col gap-xs">
            {locations.items.map((item) => (
              <li
                key={item.order}
                className="flex items-center gap-sm rounded-xs bg-surface px-sm py-xs"
              >
                <span className="text-fm-label text-foreground-muted">
                  {`위치 ${item.order}`}
                </span>
                <span className="text-fm-body text-foreground">
                  {item.name}
                </span>
                <span className="ml-auto text-fm-body text-foreground-body">
                  {`${item.cellCount}칸`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-sm">
        <h2 className="text-fm-title text-foreground">신청 이력</h2>
        {timeline.length === 0 ? (
          <p className="text-fm-body text-foreground-muted">
            아직 기록된 이력이 없어요
          </p>
        ) : (
          <ol aria-label="신청 이력 목록" className="flex flex-col gap-xs">
            {timeline.map((step) => (
              <li
                key={`${step.label}-${step.changedAt}`}
                className="flex items-center gap-sm"
              >
                <span className="text-fm-body-strong text-foreground">
                  {step.label}
                </span>
                <span className="text-fm-body text-foreground-muted">
                  {formatKstDateTime(step.changedAt)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};
