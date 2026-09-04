import { AREA_CELL_LIMIT } from "@/features/event-submission/model/submission-area";

interface AreaUsageCardProps {
  /** 확정 영역의 합집합 칸 수 (겹침 제거 — AC 5) */
  usedCells: number;
  rectCount: number;
}

/**
 * 위치 카드 (MSG-547 AC 1·5 — Figma 15525:9300) — 위치 이름 + 사용한 칸 진행 바.
 *
 * 카드 제목은 **"위치 1" 고정**이다: 서버 위치 DTO에 이름 필드가 없어(areaRects만)
 * 이름 입력을 받으면 검토·재신청에서 소실된다 — 저장되지 않는 입력은 받지 않는다는
 * 승인 확정(질문 1 (a)). 시안의 "광안리 해변 특설무대"·태그 "메인 공연장"은 예시
 * 데이터라 렌더하지 않는다. 이름 필요성은 BE 환류 대상.
 */
export const AreaUsageCard = ({ usedCells, rectCount }: AreaUsageCardProps) => (
  <section className="flex flex-col gap-xs rounded-md border border-border bg-background p-md">
    <div className="flex items-center justify-between gap-sm">
      <p className="text-fm-body-strong text-foreground">위치 1</p>
      <p className="text-fm-label text-foreground-muted">
        사용한 칸 {usedCells} / {AREA_CELL_LIMIT}
      </p>
    </div>
    <div
      role="progressbar"
      aria-label="사용한 칸"
      aria-valuemin={0}
      aria-valuemax={AREA_CELL_LIMIT}
      aria-valuenow={usedCells}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface"
    >
      {/* 진행 폭은 데이터 비율이라 토큰 클래스로 표현할 수 없다 — 인라인 폭만 예외 */}
      <div
        className="h-full rounded-full bg-primary"
        style={{
          width: `${Math.min(100, (usedCells / AREA_CELL_LIMIT) * 100)}%`,
        }}
      />
    </div>
    <p className="text-fm-caption text-foreground-muted">
      사각형 {rectCount}개 · 최대 {AREA_CELL_LIMIT}칸(9×9)
    </p>
  </section>
);
