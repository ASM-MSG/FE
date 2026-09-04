import { ImageIcon } from "lucide-react";
import type { ReviewRow } from "@/features/event-submission/model/submission-review";

interface ReviewBasicCardProps {
  title: string;
  organizerName: string;
  /** 로컬 blob 미리보기 — 업로드 전·실패면 null (플레이스홀더 렌더) */
  previewUrl: string | null;
  /** 유형별 이미지 라벨 — "대표 이미지" / EVENT는 "커버 이미지" */
  imageLabel: string;
  rows: ReviewRow[];
  onEdit: () => void;
}

/**
 * 기본 정보 요약 카드 (MSG-548 AC 1·2 — Figma 15644:2935 좌측 카드).
 * 라벨·값 파생은 `reviewBasicRows`(순수)가 하고 이 파일은 배치만 한다.
 *
 * 시안의 제목 옆 둘째 캡션("영상·현장 기록을 모으는 공식 행사")은 대응 입력 필드가 없는
 * 장식 문구라 렌더하지 않는다(스펙 추정 11 — Figma 오탐 방지 등재).
 */
export const ReviewBasicCard = ({
  title,
  organizerName,
  previewUrl,
  imageLabel,
  rows,
  onEdit,
}: ReviewBasicCardProps) => (
  <section className="flex flex-1 flex-col gap-md rounded-md border border-border bg-background p-lg">
    <div className="flex items-center justify-between gap-sm">
      <h3 className="text-fm-title text-foreground">기본 정보</h3>
      <button
        type="button"
        aria-label="기본 정보 수정"
        onClick={onEdit}
        className="text-fm-label text-primary"
      >
        수정
      </button>
    </div>

    <div className="flex items-center gap-md">
      {previewUrl === null ? (
        <span className="flex h-20 w-30 shrink-0 items-center justify-center rounded-sm bg-surface text-foreground-muted">
          <ImageIcon className="size-5" />
        </span>
      ) : (
        <img
          src={previewUrl}
          alt={`${imageLabel} 미리보기`}
          className="h-20 w-30 shrink-0 rounded-sm object-cover"
        />
      )}
      <div className="flex min-w-0 flex-col gap-xxs">
        <p className="text-fm-body-strong text-foreground">{title}</p>
        <p className="text-fm-caption text-foreground-muted">
          {organizerName} 주최
        </p>
      </div>
    </div>

    <dl className="grid grid-cols-2 gap-md">
      {rows.map((row) => (
        <div
          key={row.label}
          className={
            row.fullWidth
              ? "col-span-2 flex flex-col gap-xxs"
              : "flex flex-col gap-xxs"
          }
        >
          <dt className="text-fm-label text-foreground-muted">{row.label}</dt>
          <dd className="whitespace-pre-line text-fm-body text-foreground">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  </section>
);
