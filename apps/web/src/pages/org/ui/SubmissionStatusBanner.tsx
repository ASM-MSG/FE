import { cn } from "@fillmap/ui-web";
import type { OrgSubmissionStatus } from "@/entities/org-submission/model/org-submission";

/**
 * SOURCE: Figma 심사 결과 상세 3상태 — 심사 중(15525:8923) · 승인(15525:8967) ·
 * 반려(15525:9011)의 상단 상태 배너(톤 제목 + 본문 1줄).
 *
 * 대응 API가 없는 안내 문구라 FE 고정 문구다 (추정 4). 반려 본문은 시안의 요약 문장이
 * 아니라 고정 안내로 둔다 — API의 자유 서술은 `reasonText` 하나뿐이고 그 정본 자리는
 * 결과 카드의 "검토 의견" 필드다 (추정 6, 중복 렌더 회피).
 *
 * 미지 status는 배너를 렌더하지 않는다 (AC 11) — 호출부가 가드로 걸러 준다.
 */
const BANNERS: Record<
  OrgSubmissionStatus,
  { title: string; body: string; tone: string }
> = {
  IN_REVIEW: {
    title: "심사 진행 중",
    body: "신청이 접수되어 운영팀이 등록 내용을 검토하고 있습니다.",
    tone: "border-warning/30 bg-warning/10 text-warning",
  },
  APPROVED: {
    title: "승인 완료",
    body: "행사 등록이 승인되어 일반 유저 지도와 행사방에 노출되고 있습니다.",
    tone: "border-success/30 bg-success/10 text-success",
  },
  REJECTED: {
    title: "반려됨 · 수정 필요",
    body: "반려 항목을 확인하고 수정 후 다시 제출해 주세요.",
    tone: "border-error/30 bg-error/10 text-error",
  },
};

export const SubmissionStatusBanner = ({
  status,
}: {
  status: OrgSubmissionStatus;
}) => {
  const banner = BANNERS[status];

  return (
    <section
      aria-label="심사 상태 안내"
      className={cn(
        "flex flex-col gap-xxs rounded-sm border p-lg",
        banner.tone,
      )}
    >
      <p className="text-fm-title">{banner.title}</p>
      <p className="text-fm-body text-foreground-body">{banner.body}</p>
    </section>
  );
};
