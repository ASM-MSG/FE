import type { ReviewAreaSummary } from "@/features/event-submission/model/submission-review";

interface ReviewAreaCardProps {
  summary: ReviewAreaSummary;
  onEdit: () => void;
}

/**
 * 위치 영역 요약 카드 (MSG-548 AC 1·3 — Figma 15644:2935 우측 카드).
 * 칸 수·행 문구는 `reviewAreaSummary`(순수 — `submission-area` 위임)가 소유한다.
 *
 * 시안의 위치 3곳·위치 이름("광안리 해변 특설무대")·zone 라벨은 서버 계약에 이름 필드가
 * 없고(MSG-547 승인 (a)안) 위저드가 확정하는 위치는 1곳이라 재현하지 않는다 —
 * 행은 "영역 i · 가로 a × 세로 b · c칸" 꼴이 정본이다(스펙 Figma 오탐 방지).
 */
export const ReviewAreaCard = ({ summary, onEdit }: ReviewAreaCardProps) => (
  <section className="flex flex-1 flex-col gap-md rounded-md border border-border bg-background p-lg">
    <div className="flex items-center justify-between gap-sm">
      <h3 className="text-fm-title text-foreground">위치 영역</h3>
      <button
        type="button"
        aria-label="위치 영역 수정"
        onClick={onEdit}
        className="text-fm-label text-primary"
      >
        수정
      </button>
    </div>

    <div className="flex items-baseline justify-between gap-sm">
      <p className="text-fm-body-strong text-foreground">
        {summary.countLabel}
      </p>
      <p className="text-fm-label text-foreground-muted">{summary.cellLabel}</p>
    </div>

    <ol className="flex flex-col gap-xxs">
      {summary.rowLabels.map((label, index) => (
        <li
          // 같은 사각형을 두 번 확정할 수 있어 좌표·문구는 식별자가 되지 못한다 (AreaRectList 선례)
          key={index}
          className="flex items-center gap-sm rounded-sm border border-border px-md py-xs"
        >
          <span className="text-fm-caption text-foreground-muted">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-fm-body text-foreground">{label}</span>
        </li>
      ))}
    </ol>
  </section>
);
