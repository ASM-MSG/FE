import { Skeleton } from "@fillmap/ui-web";

/**
 * 신청 한 건을 조회하는 동안의 자리표시 (MSG-549 상세 · MSG-550 수정 모드 공용).
 * 두 화면이 같은 상세 API 한 건을 기다리며 같은 골격(배너 자리 + 본문 카드 자리)을 쓰므로
 * 한 컴포넌트로 모았다 — 안내 문구만 화면별로 갈린다(중복 게이트 검출).
 */
export const SubmissionLoadingSkeleton = ({ label }: { label: string }) => (
  <div className="flex flex-col gap-md">
    <p role="status" className="sr-only">
      {label}
    </p>
    <Skeleton className="h-24 w-full rounded-sm" />
    <Skeleton className="h-60 w-full rounded-sm" />
  </div>
);
